/**
 * MemoryService implementation (interim, language-model based).
 *
 * Selects a small number of durable, user-provided facts worth remembering.
 * It deliberately ignores temporary emotional states. Replaceable by a trained
 * model behind the same `MemoryService` interface.
 */
import type { MemoryCandidate, MemoryService } from "@/lib/ml/types";
import { createLovableAiGatewayRunIdFetch } from "./run-id";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";
const CATEGORIES: MemoryCandidate["category"][] = [
  "important_event",
  "conversation_preference",
  "personal_context",
  "goal",
  "ongoing_project",
];

const INSTRUCTIONS = `You decide what, if anything, from the latest user message should be saved as long-term memory for a support assistant.

Save ONLY durable, user-provided information that will still matter in future conversations:
- conversation_preference: how they want to be spoken to (e.g. "Prefers direct, practical responses.")
- personal_context: stable facts about their life they shared (job, studies, city, relationships)
- goal: long-term goals
- ongoing_project: things they are working on over time
- important_event: specific upcoming or recent significant events (interview on a date, move, exam)
- Anything they explicitly ask you to remember (choose the best category).

NEVER save:
- temporary feelings or moods ("stressed today", "feeling low") — never turn them into traits
- diagnoses, medical labels, or guesses about their mental state
- anything already covered by the existing memories
- small talk, questions, or the assistant's own words

Write each memory as one short neutral third-person sentence ("Is preparing for a job interview at a design studio."). Most messages produce nothing. Return at most 3.

Respond with JSON only: {"memories":[{"category":"...","content":"..."}]}`;

export function createMemoryService(runId?: string): MemoryService {
  return {
    async propose({ text, assistantReply, existing }) {
      const provenance = { source: "mock_ml_service" as const, version: "llm-interim-0.2" };
      const apiKey = process.env["LOVABLE_API_KEY"];
      if (!apiKey) return { candidates: [], ...provenance };

      const gateway = createLovableAiGatewayRunIdFetch(runId);
      const response = await gateway.fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: MODEL,
          store: false,
          reasoning: { effort: "low" },
          text: { format: { type: "json_object" } },
          input: [
            { role: "system", content: INSTRUCTIONS },
            {
              role: "user",
              content: JSON.stringify({
                existing_memories: (existing ?? []).map((m) => m.content),
                latest_user_message: text,
                assistant_reply_for_context: assistantReply?.slice(0, 1500) ?? "",
              }),
            },
          ],
        }),
      });
      if (!response.ok) throw new Error(`Memory extraction failed: ${response.status}`);

      const payload = (await response.json()) as {
        output_text?: string;
        output?: { type: string; content?: { type: string; text?: string }[] }[];
      };
      const raw =
        payload.output_text ??
        (payload.output ?? [])
          .flatMap((item) => item.content ?? [])
          .filter((c) => c.type === "output_text")
          .map((c) => c.text ?? "")
          .join("");

      let parsed: { memories?: { category?: string; content?: string }[] } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { candidates: [], ...provenance };
      }
      const seen = new Set((existing ?? []).map((m) => m.content.trim().toLowerCase()));
      const candidates = (parsed.memories ?? [])
        .filter(
          (m): m is MemoryCandidate =>
            !!m.content &&
            m.content.trim().length > 3 &&
            CATEGORIES.includes(m.category as MemoryCandidate["category"]),
        )
        .map((m) => ({ category: m.category, content: m.content.trim().slice(0, 300) }))
        .filter((m) => !seen.has(m.content.toLowerCase()))
        .slice(0, 3);
      return { candidates, ...provenance };
    },
  };
}
