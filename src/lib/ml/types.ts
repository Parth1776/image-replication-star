/**
 * Service interfaces for the emotional intelligence layer.
 *
 * These contracts are intentionally provider-agnostic. Today they are backed by
 * `mock-services.ts` (clearly marked Mock ML Service implementations). Our own
 * trained models will replace those implementations without changing this file
 * or any consumer of it.
 */

export type SignalKey =
  | "stress"
  | "anxiety"
  | "sadness"
  | "frustration"
  | "loneliness"
  | "positive_engagement";

export type SignalScores = Partial<Record<SignalKey, number>>;

export interface EmotionEstimate {
  emotion: SignalScores;
  intensity: number;
  confidence: number;
}

export interface IntentEstimate {
  intent:
    | "vent"
    | "seek_advice"
    | "seek_information"
    | "reflect"
    | "share_good_news"
    | "unclear";
  confidence: number;
}

export interface RiskEstimate {
  distress_level: "normal" | "elevated" | "high";
  immediate_safety_concern: boolean;
  confidence: number;
}

export type InteractionMode = "normal" | "safety";

export interface InteractionPolicyDecision {
  mode: "supportive" | "practical" | "reflective" | "safety";
  strategy:
    | "listen_and_validate"
    | "ask_clarifying_question"
    | "offer_practical_help"
    | "encourage_reflection"
    | "encourage_real_world_support";
}

export interface TrajectoryPoint {
  date: string;
  signals: SignalScores;
  intensity: number;
}

export interface TrajectorySummary {
  points: TrajectoryPoint[];
  trends: { signal: SignalKey; direction: "up" | "down" | "steady"; change: number }[];
}

export interface MemoryCandidate {
  category:
    | "important_event"
    | "conversation_preference"
    | "personal_context"
    | "emotional_pattern"
    | "goal"
    | "ongoing_project";
  content: string;
}

export interface ServiceProvenance {
  /** Identifies which implementation produced the output. */
  source: "mock_ml_service" | "trained_model";
  version: string;
}

export interface EmotionService {
  estimate(input: { text: string; history?: string[] }): Promise<EmotionEstimate & ServiceProvenance>;
}

export interface IntentService {
  detect(input: { text: string }): Promise<IntentEstimate & ServiceProvenance>;
}

export interface RiskService {
  assess(input: { text: string; emotion: EmotionEstimate }): Promise<RiskEstimate & ServiceProvenance>;
}

export interface TrajectoryService {
  summarize(input: {
    states: { created_at: string; signals: SignalScores; intensity: number | null }[];
  }): Promise<TrajectorySummary & ServiceProvenance>;
}

export interface InteractionPolicyService {
  select(input: {
    emotion: EmotionEstimate;
    intent: IntentEstimate;
    risk: RiskEstimate;
    communicationStyle: string;
  }): Promise<InteractionPolicyDecision & ServiceProvenance>;
}

export interface MemoryService {
  propose(input: {
    text: string;
    assistantReply?: string;
    existing?: { category: string; content: string }[];
  }): Promise<{ candidates: MemoryCandidate[] } & ServiceProvenance>;
}

export interface LLMService {
  /** Generates the user-visible reply text as a stream of chunks. */
  streamReply(input: {
    systemPrompt: string;
    messages: { role: "user" | "assistant"; content: string }[];
    signal?: AbortSignal;
  }): Promise<ReadableStream<string>>;
}
