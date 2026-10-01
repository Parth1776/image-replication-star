import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EstimateNote, PageIntro } from "@/components/app/EstimateNote";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Overview — Emotionala Ai" },
      {
        name: "description",
        content: "Your private overview: recent conversations, observations, and safety settings.",
      },
      { property: "og:title", content: "Overview — Emotionala Ai" },
      {
        property: "og:description",
        content: "Recent conversations, observations, and safety settings in one calm place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const summary = useQuery({
    queryKey: ["overview"],
    queryFn: async () => {
      const [conversations, memories, insights, profile] = await Promise.all([
        supabase
          .from("conversations")
          .select("id, title, updated_at")
          .eq("archived", false)
          .order("updated_at", { ascending: false })
          .limit(3),
        supabase.from("memories").select("id", { count: "exact", head: true }),
        supabase
          .from("insights")
          .select("id, headline")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase.from("profiles").select("display_name, communication_style").maybeSingle(),
      ]);
      return {
        conversations: conversations.data ?? [],
        memoryCount: memories.count ?? 0,
        insights: insights.data ?? [],
        profile: profile.data,
      };
    },
  });

  const { firstName: name } = useDisplayName();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageIntro
        eyebrow="Overview"
        title={name ? `Welcome back, ${name}` : "Welcome back"}
        description="Everything here is generated from your own conversations and stays under your control."
        action={
          <Button asChild>
            <Link to="/app/chat">Continue a conversation</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="eyebrow">Recent conversations</p>
          <ul className="mt-3 space-y-2 text-sm">
            {(summary.data?.conversations ?? []).map((conversation) => (
              <li key={conversation.id}>
                <Link
                  to="/app/chat/$conversationId"
                  params={{ conversationId: conversation.id }}
                  className="line-clamp-1 text-foreground underline-offset-4 hover:underline"
                >
                  {conversation.title}
                </Link>
              </li>
            ))}
            {summary.data?.conversations.length === 0 && (
              <li className="text-muted-foreground">Nothing yet.</li>
            )}
          </ul>
        </div>

        <div className="panel p-5">
          <p className="eyebrow">What you've mentioned</p>
          <p className="display-heading mt-3 text-3xl text-foreground">
            {summary.data?.memoryCount ?? 0}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            remembered details, all editable in{" "}
            <Link to="/app/memory" className="underline underline-offset-4">
              Memory
            </Link>
            .
          </p>
        </div>

        <div className="panel p-5">
          <p className="eyebrow">What we've noticed</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {(summary.data?.insights ?? []).map((insight) => (
              <li key={insight.id} className="line-clamp-2 text-foreground">
                {insight.headline}
              </li>
            ))}
            {summary.data?.insights.length === 0 && (
              <li>No observations yet — they appear as conversations build up.</li>
            )}
          </ul>
        </div>
      </div>

      <EstimateNote>
        Signals, trends, and observations across this app are AI-generated estimates based on your
        conversations. They are not medical measurements or diagnoses, and they can be wrong. Custom
        emotion models are in development and not yet connected — the current analysis layer is a
        clearly marked mock service.
      </EstimateNote>
    </div>
  );
}
