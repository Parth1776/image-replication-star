import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EstimateNote, PageIntro } from "@/components/app/EstimateNote";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/insights")({
  head: () => ({
    meta: [
      { title: "Insights — Emotionala Ai" },
      {
        name: "description",
        content: "Observations drawn from your conversations, which you can confirm or correct.",
      },
      { property: "og:title", content: "Insights — Emotionala Ai" },
      {
        property: "og:description",
        content: "Observations drawn from your conversations, which you can confirm or correct.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const queryClient = useQueryClient();
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [correction, setCorrection] = useState("");

  const insights = useQuery({
    queryKey: ["insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights")
        .select("id, kind, headline, body, user_confirmation, user_correction")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const respond = useMutation({
    mutationFn: async (input: {
      id: string;
      confirmation: "accurate" | "not_accurate";
      correction?: string;
    }) => {
      const { error } = await supabase
        .from("insights")
        .update({
          user_confirmation: input.confirmation,
          user_correction: input.correction ?? null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setCorrecting(null);
      setCorrection("");
      queryClient.invalidateQueries({ queryKey: ["insights"] });
    },
    onError: () => toast.error("That didn't save. Please try again."),
  });

  const list = insights.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageIntro
        eyebrow="What we've noticed"
        title="Insights"
        description="Observations built from your conversations. Correct anything that doesn't fit — your correction is kept alongside it."
      />

      <EstimateNote>
        These are observations generated from your conversations, not clinical assessments. They can
        be wrong, and they are never a diagnosis.
      </EstimateNote>

      {insights.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!insights.isLoading && list.length === 0 && (
        <div className="panel p-6 text-sm text-muted-foreground">
          Nothing noticed yet. Observations appear once there are enough conversations to see
          something repeat.
        </div>
      )}

      <div className="space-y-4">
        {list.map((insight) => (
          <article key={insight.id} className="panel p-5">
            <p className="eyebrow">{insight.kind.replace(/_/g, " ")}</p>
            <h2 className="mt-2 text-base leading-relaxed text-foreground">{insight.headline}</h2>
            {insight.body && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{insight.body}</p>
            )}

            {insight.user_confirmation ? (
              <p className="mt-4 text-xs text-muted-foreground">
                You marked this as{" "}
                {insight.user_confirmation === "accurate" ? "accurate" : "not quite right"}.
                {insight.user_correction && (
                  <>
                    {" "}
                    Your note: <span className="text-foreground">{insight.user_correction}</span>
                  </>
                )}
              </p>
            ) : (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">Does this feel accurate?</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respond.mutate({ id: insight.id, confirmation: "accurate" })}
                  >
                    Yes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCorrecting(insight.id)}>
                    Not really
                  </Button>
                </div>
              </div>
            )}

            {correcting === insight.id && (
              <div className="mt-3">
                <Textarea
                  value={correction}
                  onChange={(event) => setCorrection(event.target.value)}
                  placeholder="What would be closer to the truth? (optional)"
                  rows={2}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      respond.mutate({
                        id: insight.id,
                        confirmation: "not_accurate",
                        correction: correction.trim() || undefined,
                      })
                    }
                  >
                    Save correction
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setCorrecting(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
