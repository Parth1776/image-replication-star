/**
 * LLMService implementation.
 *
 * This produces the user-visible language of a reply only. It does NOT perform
 * emotion understanding, distress detection or interaction-strategy selection —
 * those decisions come from the services in `src/lib/ml` and are passed in as
 * instructions. Safety-critical decisions must never rely solely on this layer.
 */

import type { LLMService } from "@/lib/ml/types";
import { createLovableAiGatewayRunIdFetch } from "./run-id";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

export function createLLMService(runId?: string): LLMService {
  return {
    async streamReply({ systemPrompt, messages, signal }) {
      const apiKey = process.env["LOVABLE_API_KEY"];
      if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

      const gateway = createLovableAiGatewayRunIdFetch(runId);
      const response = await gateway.fetch(GATEWAY_URL, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: MODEL,
          stream: true,
          store: false,
          reasoning: { effort: "low", summary: "auto" },
          include: ["reasoning.encrypted_content"],
          input: [
            { role: "system", content: systemPrompt },
            ...messages.map((message) => ({ role: message.role, content: message.content })),
          ],
        }),
      });

      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => "");
        const error = new Error(`AI gateway error ${response.status}: ${detail.slice(0, 400)}`);
        (error as Error & { status?: number }).status = response.status;
        throw error;
      }

      return toTextStream(response.body);
    },
  };
}

/** Parses the Responses SSE stream into user-visible text deltas. */
function toTextStream(body: ReadableStream<Uint8Array>): ReadableStream<string> {
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<string>({
    async start(controller) {
      const reader = body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";
          for (const block of blocks) {
            for (const line of block.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const event = JSON.parse(payload) as {
                  type?: string;
                  delta?: string;
                  error?: { message?: string };
                };
                if (event.type === "response.output_text.delta" && event.delta) {
                  controller.enqueue(event.delta);
                } else if (event.type === "error" || event.error) {
                  controller.error(new Error(event.error?.message ?? "AI stream error"));
                  return;
                }
              } catch {
                // Ignore keep-alive or partial frames.
              }
            }
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}
