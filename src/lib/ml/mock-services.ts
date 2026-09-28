/**
 * MOCK ML SERVICE
 * ---------------
 * Placeholder implementations of the emotional-intelligence contracts in
 * `types.ts`. These are deliberately simple, transparent heuristics — they are
 * NOT trained models and must never be described as emotion recognition.
 *
 * Replace each implementation with a call to our own trained model service.
 * Consumers only depend on the interfaces, so no frontend change is required.
 */

import type {
  EmotionService,
  IntentService,
  InteractionPolicyService,
  MemoryService,
  RiskService,
  SignalKey,
  SignalScores,
  TrajectoryService,
} from "./types";

const PROVENANCE = { source: "mock_ml_service", version: "0.1.0" } as const;

const LEXICON: Record<SignalKey, string[]> = {
  stress: ["stress", "overwhelmed", "pressure", "deadline", "too much", "busy", "burnout"],
  anxiety: ["anxious", "worried", "nervous", "panic", "scared", "afraid", "uneasy"],
  sadness: ["sad", "down", "low", "cry", "hopeless", "empty", "disappointed"],
  frustration: ["frustrated", "angry", "annoyed", "unfair", "stuck", "fed up"],
  loneliness: ["alone", "lonely", "no one", "isolated", "nobody"],
  positive_engagement: ["good", "better", "excited", "proud", "grateful", "happy", "progress"],
};

const CONCERN_PHRASES = [
  "kill myself",
  "end my life",
  "suicide",
  "self harm",
  "hurt myself",
  "don't want to be here",
  "no reason to live",
];

function score(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  const hits = terms.filter((term) => lower.includes(term)).length;
  if (hits === 0) return 0;
  return Math.min(1, 0.28 + hits * 0.2);
}

export const mockEmotionService: EmotionService = {
  async estimate({ text }) {
    const emotion: SignalScores = {};
    (Object.keys(LEXICON) as SignalKey[]).forEach((key) => {
      const value = score(text, LEXICON[key]);
      if (value > 0) emotion[key] = Number(value.toFixed(2));
    });
    const negatives = (Object.keys(emotion) as SignalKey[])
      .filter((key) => key !== "positive_engagement")
      .map((key) => emotion[key] ?? 0);
    const intensity = negatives.length
      ? Number(Math.min(1, Math.max(...negatives) + 0.1).toFixed(2))
      : 0.2;
    return {
      emotion,
      intensity,
      confidence: Object.keys(emotion).length ? 0.4 : 0.15,
      ...PROVENANCE,
    };
  },
};

export const mockIntentService: IntentService = {
  async detect({ text }) {
    const lower = text.toLowerCase();
    if (/\b(how do i|what should i|any advice|help me)\b/.test(lower))
      return { intent: "seek_advice", confidence: 0.4, ...PROVENANCE };
    if (/\b(what is|explain|define)\b/.test(lower))
      return { intent: "seek_information", confidence: 0.4, ...PROVENANCE };
    if (score(text, LEXICON.positive_engagement) > 0.4)
      return { intent: "share_good_news", confidence: 0.35, ...PROVENANCE };
    if (/\b(i feel|i'm feeling|i am feeling|today was)\b/.test(lower))
      return { intent: "vent", confidence: 0.35, ...PROVENANCE };
    return { intent: "unclear", confidence: 0.2, ...PROVENANCE };
  },
};

export const mockRiskService: RiskService = {
  async assess({ text, emotion }) {
    const lower = text.toLowerCase();
    const immediate = CONCERN_PHRASES.some((phrase) => lower.includes(phrase));
    if (immediate)
      return {
        distress_level: "high",
        immediate_safety_concern: true,
        confidence: 0.5,
        ...PROVENANCE,
      };
    if (emotion.intensity >= 0.75)
      return {
        distress_level: "elevated",
        immediate_safety_concern: false,
        confidence: 0.3,
        ...PROVENANCE,
      };
    return {
      distress_level: "normal",
      immediate_safety_concern: false,
      confidence: 0.3,
      ...PROVENANCE,
    };
  },
};

export const mockInteractionPolicyService: InteractionPolicyService = {
  async select({ emotion, intent, risk, communicationStyle }) {
    if (risk.immediate_safety_concern || risk.distress_level === "high")
      return { mode: "safety", strategy: "encourage_real_world_support", ...PROVENANCE };
    if (intent.intent === "seek_advice" || communicationStyle === "practical")
      return { mode: "practical", strategy: "offer_practical_help", ...PROVENANCE };
    if (intent.intent === "unclear")
      return { mode: "supportive", strategy: "ask_clarifying_question", ...PROVENANCE };
    if (emotion.intensity >= 0.5)
      return { mode: "supportive", strategy: "listen_and_validate", ...PROVENANCE };
    return { mode: "reflective", strategy: "encourage_reflection", ...PROVENANCE };
  },
};

export const mockTrajectoryService: TrajectoryService = {
  async summarize({ states }) {
    const byDay = new Map<string, { signals: SignalScores; intensity: number; count: number }>();
    states.forEach((state) => {
      const day = state.created_at.slice(0, 10);
      const entry = byDay.get(day) ?? { signals: {}, intensity: 0, count: 0 };
      (Object.keys(state.signals) as SignalKey[]).forEach((key) => {
        entry.signals[key] = (entry.signals[key] ?? 0) + (state.signals[key] ?? 0);
      });
      entry.intensity += state.intensity ?? 0;
      entry.count += 1;
      byDay.set(day, entry);
    });

    const points = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entry]) => {
        const signals: SignalScores = {};
        (Object.keys(entry.signals) as SignalKey[]).forEach((key) => {
          signals[key] = Number(((entry.signals[key] ?? 0) / entry.count).toFixed(2));
        });
        return { date, signals, intensity: Number((entry.intensity / entry.count).toFixed(2)) };
      });

    const trends = (Object.keys(LEXICON) as SignalKey[]).map((signal) => {
      const series = points.map((point) => point.signals[signal] ?? 0);
      const half = Math.floor(series.length / 2) || 1;
      const avg = (values: number[]) =>
        values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
      const change = Number((avg(series.slice(half)) - avg(series.slice(0, half))).toFixed(2));
      return {
        signal,
        direction: (change > 0.05 ? "up" : change < -0.05 ? "down" : "steady") as
          | "up"
          | "down"
          | "steady",
        change,
      };
    });

    return { points, trends, ...PROVENANCE };
  },
};

export const mockMemoryService: MemoryService = {
  async propose({ text }) {
    const candidates: { category: "important_event" | "personal_context"; content: string }[] = [];
    const interview = text.match(/\b(interview|exam|presentation|deadline|surgery|wedding)\b/i);
    if (interview)
      candidates.push({
        category: "important_event",
        content: `User mentioned an upcoming ${interview[1].toLowerCase()}.`,
      });
    const project = text.match(/\bworking on ([^.!?]{3,60})/i);
    if (project)
      candidates.push({
        category: "personal_context",
        content: `User is working on ${project[1].trim()}.`,
      });
    return { candidates, ...PROVENANCE };
  },
};
