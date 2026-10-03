import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { PageIntro } from "@/components/app/EstimateNote";
import { COMMUNICATION_STYLES, INTERACTION_PRIORITIES } from "@/lib/signals";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/personalization")({
  head: () => ({
    meta: [
      { title: "Personalization — Emotionala Ai" },
      { name: "description", content: "Choose how Emotionala Ai talks with you." },
      { property: "og:title", content: "Personalization — Emotionala Ai" },
      { property: "og:description", content: "Choose how Emotionala Ai talks with you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PersonalizationPage,
});

function PersonalizationPage() {
  const queryClient = useQueryClient();
  const [style, setStyle] = useState("conversational");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const profile = useQuery({
    queryKey: ["personalization"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("profiles")
        .select("communication_style, interaction_priorities, interaction_notes")
        .eq("id", userData.user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!profile.data) return;
    setStyle(profile.data.communication_style);
    setPriorities(profile.data.interaction_priorities ?? []);
    setNotes(profile.data.interaction_notes ?? "");
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("profiles")
        .update({
          communication_style: style,
          interaction_priorities: priorities,
          interaction_notes: notes.trim().slice(0, 1000) || null,
        })
        .eq("id", userData.user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preferences saved.");
      queryClient.invalidateQueries({ queryKey: ["personalization"] });
    },
    onError: () => toast.error("Could not save your preferences."),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageIntro
        eyebrow="Personalization"
        title="How Emotionala Ai talks with you"
        description="These preferences shape every reply. Change them whenever you like."
      />

      <section className="panel space-y-4 p-6">
        <h2 className="text-sm font-medium text-foreground">How should Emotionala Ai talk to you?</h2>
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          {COMMUNICATION_STYLES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={style === option.value}
              onClick={() => setStyle(option.value)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition-colors",
                style === option.value
                  ? "border-primary bg-secondary"
                  : "border-border hover:bg-secondary/60",
              )}
            >
              <span className="block text-sm font-medium text-foreground">{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel space-y-4 p-6">
        <h2 className="text-sm font-medium text-foreground">What should Emotionala Ai prioritize?</h2>
        <div className="space-y-3">
          {INTERACTION_PRIORITIES.map((option) => (
            <label key={option.value} className="flex items-center gap-3 text-sm text-foreground">
              <Checkbox
                checked={priorities.includes(option.value)}
                onCheckedChange={(checked) =>
                  setPriorities((current) =>
                    checked
                      ? [...current, option.value]
                      : current.filter((value) => value !== option.value),
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      </section>

      <section className="panel space-y-3 p-6">
        <h2 className="text-sm font-medium text-foreground">
          Anything else you'd like Emotionala Ai to know about how you want to interact?
        </h2>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Example: Don't give me generic motivational advice. Be direct with me."
        />
      </section>

      <Button onClick={() => save.mutate()} disabled={save.isPending || profile.isLoading}>
        {save.isPending ? "Saving…" : "Save preferences"}
      </Button>
    </div>
  );
}
