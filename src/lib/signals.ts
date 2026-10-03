import type { SignalKey } from "@/lib/ml/types";

export const SIGNAL_META: Record<SignalKey, { label: string; color: string }> = {
  stress: { label: "Stress", color: "var(--signal-stress)" },
  anxiety: { label: "Anxiety", color: "var(--signal-anxiety)" },
  sadness: { label: "Sadness", color: "var(--signal-sadness)" },
  frustration: { label: "Frustration", color: "var(--signal-frustration)" },
  loneliness: { label: "Loneliness", color: "var(--signal-loneliness)" },
  positive_engagement: { label: "Positive engagement", color: "var(--signal-positive)" },
};

export const SIGNAL_KEYS = Object.keys(SIGNAL_META) as SignalKey[];

export const MEMORY_CATEGORIES = [
  { value: "important_event", label: "Important event" },
  { value: "conversation_preference", label: "Conversation preference" },
  { value: "personal_context", label: "Personal context" },
  { value: "emotional_pattern", label: "Emotional pattern" },
  { value: "goal", label: "Goal" },
  { value: "ongoing_project", label: "Ongoing project" },
] as const;

export const INTERACTION_PRIORITIES = [
  { value: "listen_first", label: "Listen before giving advice" },
  { value: "practical_solutions", label: "Give practical solutions" },
  { value: "ask_questions", label: "Ask questions to understand me" },
  { value: "concise", label: "Keep responses concise" },
  { value: "detailed", label: "Explain things in detail" },
] as const;

export const COMMUNICATION_STYLES = [
  { value: "direct", label: "Direct", hint: "Clear and to the point." },
  { value: "gentle", label: "Gentle", hint: "Unhurried, soft in tone." },
  { value: "practical", label: "Practical", hint: "Focused on concrete next steps." },
  { value: "conversational", label: "Conversational", hint: "Warm and informal." },
  { value: "balanced", label: "Balanced", hint: "Adapts the tone to the moment." },
] as const;
