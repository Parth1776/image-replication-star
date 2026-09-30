import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EstimateNote, PageIntro } from "@/components/app/EstimateNote";
import { SIGNAL_KEYS, SIGNAL_META } from "@/lib/signals";
import { mockTrajectoryService } from "@/lib/ml/mock-services";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline — Emotionala Ai" },
      {
        name: "description",
        content: "Emotional patterns and recent trends estimated from your own conversations.",
      },
      { property: "og:title", content: "Timeline — Emotionala Ai" },
      {
        property: "og:description",
        content: "Emotional patterns and recent trends estimated from your own conversations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TimelinePage,
});

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

function TimelinePage() {
  const [days, setDays] = useState<number>(30);
  const [eventLabel, setEventLabel] = useState("");
  const queryClient = useQueryClient();

  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const timeline = useQuery({
    queryKey: ["timeline", days],
    queryFn: async () => {
      const [states, events] = await Promise.all([
        supabase
          .from("emotional_states")
          .select("created_at, signals, intensity")
          .gte("created_at", since)
          .order("created_at", { ascending: true }),
        supabase
          .from("emotional_events")
          .select("id, label, note, occurred_on")
          .gte("occurred_on", since.slice(0, 10))
          .order("occurred_on", { ascending: true }),
      ]);
      const summary = await mockTrajectoryService.summarize({
        states: (states.data ?? []).map((state) => ({
          created_at: state.created_at,
          signals: (state.signals ?? {}) as Record<string, number>,
          intensity: state.intensity === null ? null : Number(state.intensity),
        })),
      });
      return { summary, events: events.data ?? [] };
    },
  });

  const addEvent = useMutation({
    mutationFn: async (label: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      const { error } = await supabase.from("emotional_events").insert({ user_id: userId, label });
      if (error) throw error;
    },
    onSuccess: () => {
      setEventLabel("");
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
    onError: () => toast.error("Could not save that event."),
  });

  const points = timeline.data?.summary.points ?? [];
  const chartData = points.map((point) => ({
    date: point.date,
    intensity: point.intensity,
    ...point.signals,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageIntro
        eyebrow="Emotional patterns"
        title="Timeline"
        description="Conversation signals over time, with the events you've chosen to mark."
        action={
          <div className="flex gap-1 rounded-full border border-border p-1">
            {RANGES.map((range) => (
              <button
                key={range.days}
                type="button"
                onClick={() => setDays(range.days)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs text-muted-foreground transition-colors",
                  days === range.days && "bg-surface text-foreground",
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        }
      />

      <EstimateNote>
        These are AI-generated estimates based on your conversations, not medical measurements or
        diagnoses. The analysis layer is currently a clearly marked mock service; our own emotion
        models are in development.
      </EstimateNote>

      <div className="panel p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">Conversation signals</h2>
          <div className="flex flex-wrap gap-3">
            {SIGNAL_KEYS.map((key) => (
              <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: SIGNAL_META[key].color }}
                />
                {SIGNAL_META[key].label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 h-72">
          {chartData.length === 0 ? (
            <p className="pt-16 text-center text-sm text-muted-foreground">
              No conversation signals in this period yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                {(timeline.data?.events ?? []).map((event) => (
                  <ReferenceLine
                    key={event.id}
                    x={event.occurred_on}
                    stroke="var(--signal-intensity)"
                    strokeDasharray="3 3"
                    label={{ value: event.label, fontSize: 10, fill: "var(--muted-foreground)" }}
                  />
                ))}
                {SIGNAL_KEYS.map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={SIGNAL_META[key].color}
                    strokeWidth={1.8}
                    dot={false}
                    connectNulls
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="intensity"
                  stroke="var(--signal-intensity)"
                  strokeWidth={1.2}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-sm font-medium text-foreground">Recent trends</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(timeline.data?.summary.trends ?? []).map((trend) => (
              <li key={trend.signal} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{SIGNAL_META[trend.signal].label}</span>
                <span className="text-foreground">
                  {trend.direction === "steady"
                    ? "Steady"
                    : trend.direction === "up"
                      ? "Appearing more often"
                      : "Appearing less often"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-medium text-foreground">Mark something that happened</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Your own markers only — nothing is added automatically.
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              value={eventLabel}
              onChange={(event) => setEventLabel(event.target.value)}
              placeholder="e.g. Started a new job"
              aria-label="Event description"
            />
            <Button
              onClick={() => eventLabel.trim() && addEvent.mutate(eventLabel.trim())}
              disabled={!eventLabel.trim() || addEvent.isPending}
            >
              Add
            </Button>
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            {(timeline.data?.events ?? []).map((event) => (
              <li key={event.id}>
                <span className="text-foreground">{event.label}</span> ·{" "}
                {new Date(event.occurred_on).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
