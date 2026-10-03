import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDisplayName } from "@/hooks/useDisplayName";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Home — Emotionala Ai" },
      { name: "description", content: "Start a private conversation with Emotionala Ai." },
      { property: "og:title", content: "Home — Emotionala Ai" },
      { property: "og:description", content: "Start a private conversation with Emotionala Ai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

export const PENDING_MESSAGE_KEY = "emotionala-pending-message";

function Home() {
  const { firstName } = useDisplayName();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const start = useMutation({
    mutationFn: async (content: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title: "New conversation" })
        .select("id")
        .single();
      if (error) throw error;
      sessionStorage.setItem(PENDING_MESSAGE_KEY, JSON.stringify({ id: data.id, content }));
      return data.id;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      navigate({ to: "/app/chat/$conversationId", params: { conversationId: id } });
    },
    onError: () => toast.error("Could not start a conversation."),
  });

  function submit() {
    const content = draft.trim();
    if (!content || start.isPending) return;
    start.mutate(content);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center">
      <h1 className="display-heading fade-rise text-3xl tracking-tight text-foreground sm:text-4xl">
        {firstName ? `What's on your mind, ${firstName}?` : "What's on your mind?"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Start wherever you like — a detail, a whole day, or something you can't place yet.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-surface/70 p-3">
        <Textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Write as much or as little as you want…"
          rows={3}
          aria-label="Message"
          className="min-h-[4.5rem] resize-none border-0 bg-transparent p-1 text-sm shadow-none focus-visible:ring-0"
        />
        <div className="mt-1 flex justify-end">
          <Button size="sm" className="rounded-full" onClick={submit} disabled={!draft.trim() || start.isPending}>
            <ArrowUp className="size-4" strokeWidth={2} />
            Send
          </Button>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Emotionala Ai is an AI system, not a therapist or emergency service.
      </p>
    </div>
  );
}
