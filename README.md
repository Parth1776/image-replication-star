# Emotionala Ai

An emotionally adaptive AI support system. Understand the person and the emotional context first; then decide how to interact.

> Not a medical device, therapist, or emergency service. Signals are AI-generated estimates, not diagnoses.

## Architecture

```text
Browser (TanStack Start / React)
  └─ /api/chat (server route, verifies session)
       ├─ Mock ML Service layer  (src/lib/ml)   ← replace with trained models
       │    Emotion · Intent · Risk · InteractionPolicy · Trajectory · Memory
       ├─ LLMService (src/lib/ai) — language generation only
       └─ Database (row-level security per user)
```

- `src/lib/ml/types.ts` — provider-agnostic service contracts.
- `src/lib/ml/mock-services.ts` — **Mock ML Service**: transparent heuristics, not trained models.
- `src/lib/ai/llm.server.ts` — streams the reply text; never makes safety decisions.
- Model outputs live in `emotional_states` / `messages.model_metadata`, separate from user-visible content, and are never shown raw.
- Safety: backend sets `conversations.interaction_mode` to `normal` or `safety`; the UI adapts without code changes. No automatic contact of anyone.

## Implemented

Landing, how-it-works, auth (email + Google), app shell, threaded streaming chat with feedback, timeline (7/30/90d, user events), insights with corrections, memory (add/edit/delete/clear all), safety centre (plan, trusted contacts, escalation opt-in), settings (account, privacy, communication style, export, deletion).

## Planned (not implemented)

Custom-trained emotion, intensity, intent, distress, strategy and trajectory models; region-aware emergency resources; attachments and voice; labelled demo dataset.

## Development

`bun install && bun run dev`. Server needs `LOVABLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (provided by the platform).
