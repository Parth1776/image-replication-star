import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  mockEmotionService,
  mockIntentService,
  mockInteractionPolicyService,
  mockRiskService,
} from "@/lib/ml/mock-services";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { createLLMService } from "@/lib/ai/llm.server";
import { getLovableAiGatewayRunId } from "@/lib/ai/run-id";
import { createMemoryService } from "@/lib/ai/memory.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json({ error: "Not signed in" }, 401);

        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
                headers.delete("Authorization");
              }
              headers.set("apikey", key);
              if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers });
            },
          },
        });

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser(token);
        if (userError || !user) return json({ error: "Not signed in" }, 401);

        let body: { conversationId?: string; content?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return json({ error: "Invalid request" }, 400);
        }
        const content = body.content?.trim();
        const conversationId = body.conversationId;
        if (!content || !conversationId) return json({ error: "Invalid request" }, 400);
        if (content.length > 8000) return json({ error: "Message is too long" }, 400);

        const { data: conversation } = await supabase
          .from("conversations")
          .select("id, interaction_mode")
          .eq("id", conversationId)
          .maybeSingle();
        if (!conversation) return json({ error: "Conversation not found" }, 404);

        const [{ data: profile }, { data: safetyPlan }, { data: memories }, { data: history }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("display_name, communication_style, memory_enabled, store_conversations, interaction_priorities, interaction_notes")
              .eq("id", user.id)
              .maybeSingle(),
            supabase
              .from("safety_plans")
              .select("safety_mode_enabled")
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("memories")
              .select("category, content")
              .eq("user_id", user.id)
              .order("updated_at", { ascending: false })
              .limit(25),
            supabase
              .from("messages")
              .select("role, content")
              .eq("conversation_id", conversationId)
              .order("created_at", { ascending: true })
              .limit(40),
          ]);

        const memoryEnabled = profile?.memory_enabled ?? true;
        const communicationStyle = profile?.communication_style ?? "conversational";

        // --- Mock ML Service layer -------------------------------------------
        const emotion = await mockEmotionService.estimate({ text: content });
        const intent = await mockIntentService.detect({ text: content });
        const risk = await mockRiskService.assess({ text: content, emotion });
        const policy = await mockInteractionPolicyService.select({
          emotion,
          intent,
          risk,
          communicationStyle,
        });
        // ---------------------------------------------------------------------

        const safetyModeAllowed = safetyPlan?.safety_mode_enabled ?? true;
        const mode = policy.mode === "safety" && safetyModeAllowed ? "safety" : "normal";

        const { data: userMessage, error: insertError } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            user_id: user.id,
            role: "user",
            content,
          })
          .select("id")
          .single();
        if (insertError) {
          console.error("Failed to store user message", insertError);
          return json({ error: "Could not save your message" }, 500);
        }

        // Model outputs are stored separately from user-visible content.
        const { error: stateError } = await supabase.from("emotional_states").insert({
          user_id: user.id,
          conversation_id: conversationId,
          message_id: userMessage.id,
          signals: emotion.emotion,
          intensity: emotion.intensity,
          confidence: emotion.confidence,
          source: emotion.source,
        });
        if (stateError) console.error("Failed to store emotional state", stateError);

        if (mode === "safety") {
          await supabase
            .from("audit_logs")
            .insert({
              user_id: user.id,
              action: "safety_mode_engaged",
              detail: {
                conversation_id: conversationId,
                distress_level: risk.distress_level,
                source: risk.source,
              },
            })
            .then(({ error }) => {
              if (error) console.error("Failed to write audit log", error);
            });
        }

        if (conversation.interaction_mode !== mode) {
          await supabase
            .from("conversations")
            .update({ interaction_mode: mode })
            .eq("id", conversationId);
        }

        const systemPrompt = buildSystemPrompt({
          displayName: profile?.display_name?.trim().split(/\s+/)[0] ?? null,
          communicationStyle,
          memories: memories ?? [],
          emotion,
          intent,
          risk,
          policy,
          memoryEnabled,
          priorities: profile?.interaction_priorities ?? [],
          interactionNotes: profile?.interaction_notes ?? null,
        });

        const llm = createLLMService(getLovableAiGatewayRunId(request));
        let replyStream: ReadableStream<string>;
        try {
          replyStream = await llm.streamReply({
            systemPrompt,
            messages: [
              ...(history ?? [])
                .filter((message) => message.role === "user" || message.role === "assistant")
                .map((message) => ({
                  role: message.role as "user" | "assistant",
                  content: message.content,
                })),
              { role: "user", content },
            ],
            signal: request.signal,
          });
        } catch (error) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          console.error("AI gateway call failed", error);
          const status = (error as { status?: number }).status ?? 502;
          return json(
            {
              error:
                status === 402
                  ? "The AI workspace is out of credits. Add credits to continue."
                  : "The response service is unavailable right now. Please try again.",
            },
            status === 402 ? 402 : 502,
          );
        }

        const encoder = new TextEncoder();
        let full = "";
        const out = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = replyStream.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                full += value;
                controller.enqueue(encoder.encode(value));
              }
            } catch (error) {
              console.error("Streaming failed", error);
            } finally {
              reader.releaseLock();
              if (full.trim()) {
                const { error: assistantError } = await supabase.from("messages").insert({
                  conversation_id: conversationId,
                  user_id: user.id,
                  role: "assistant",
                  content: full,
                  model_metadata: {
                    interaction_mode: mode,
                    strategy: policy.strategy,
                    policy_source: policy.source,
                    risk_source: risk.source,
                    intent: intent.intent,
                  },
                });
                if (assistantError) console.error("Failed to store reply", assistantError);
                await supabase
                  .from("conversations")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", conversationId);

                // Selective long-term memory: runs after the reply, never blocks it.
                if (memoryEnabled) {
                  try {
                    const { candidates } = await createMemoryService(
                      getLovableAiGatewayRunId(request),
                    ).propose({ text: content, assistantReply: full, existing: memories ?? [] });
                    if (candidates.length) {
                      const { error: memoryError } = await supabase.from("memories").insert(
                        candidates.map((candidate) => ({
                          user_id: user.id,
                          category: candidate.category,
                          content: candidate.content,
                          source_conversation_id: conversationId,
                        })),
                      );
                      if (memoryError) console.error("Failed to store memories", memoryError);
                    }
                  } catch (error) {
                    console.error("Memory extraction failed", error);
                  }
                }
              } else {
                controller.enqueue(
                  encoder.encode(
                    "I wasn't able to put a reply together just then. Could you try sending that again?",
                  ),
                );
              }
              controller.close();
            }
          },
          cancel: (reason) => replyStream.cancel(reason),
        });

        return new Response(out, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Interaction-Mode": mode,
          },
        });
      },
    },
  },
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
