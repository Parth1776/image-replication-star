import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, LifeBuoy } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageFeedback } from "@/components/app/MessageFeedback";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Message = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

export function ChatWindow({ conversationId, userId }: { conversationId: string; userId: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [streamed, setStreamed] = useState("");
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversation = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, interaction_mode")
        .eq("id", conversationId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const messages = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
  });

  const feedback = useQuery({
    queryKey: ["feedback", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("message_id, rating, reason")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    composerRef.current?.focus();
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.data?.length, streamed, pendingUser]);

  const send = useMutation({
    mutationFn: async (content: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Your session expired. Please sign in again.");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId, content }),
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Something went wrong sending that message.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setStreamed(text);
      }
      return text;
    },
    onMutate: (content) => {
      setPendingUser(content);
      setDraft("");
      setStreamed("");
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      await queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setPendingUser(null);
      setStreamed("");
      composerRef.current?.focus();
    },
  });

  // A message typed on the home screen is handed over once, then cleared.
  useEffect(() => {
    const raw = sessionStorage.getItem("emotionala-pending-message");
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as { id: string; content: string };
      if (pending.id === conversationId && pending.content) {
        sessionStorage.removeItem("emotionala-pending-message");
        send.mutate(pending.content);
      }
    } catch {
      sessionStorage.removeItem("emotionala-pending-message");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  function submit() {
    const content = draft.trim();
    if (!content || send.isPending) return;
    send.mutate(content);
  }

  const safetyMode = conversation.data?.interaction_mode === "safety";
  const list = messages.data ?? [];
  const feedbackByMessage = new Map(
    (feedback.data ?? []).map((row) => [row.message_id, { rating: row.rating, reason: row.reason }]),
  );

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[28rem] flex-col">
      {safetyMode && (
        <div className="mb-4 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start gap-3">
            <LifeBuoy className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.7} />
            <div className="text-sm leading-relaxed">
              <p className="font-medium text-foreground">This conversation is in safety mode</p>
              <p className="mt-1 text-muted-foreground">
                The conversation has shifted to a simpler, safety-focused way of talking. Nothing has
                been shared with anyone, and nobody is contacted without your permission.
              </p>
              <Link
                to="/app/safety"
                className="mt-2 inline-block text-sm font-medium text-foreground underline underline-offset-4"
              >
                Open your safety centre
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
        {messages.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!messages.isLoading && list.length === 0 && !pendingUser && (
          <div className="fade-rise max-w-lg pt-10">
            <h2 className="display-heading text-2xl tracking-tight text-foreground">
              What's on your mind?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Start wherever you like — a detail, a whole day, or something you can't place yet.
            </p>
          </div>
        )}

        {list.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
          >
            <div className={cn("max-w-[42rem]", message.role === "user" && "text-right")}>
              <div
                className={cn(
                  "whitespace-pre-wrap text-sm leading-relaxed",
                  message.role === "user"
                    ? "inline-block rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-left text-primary-foreground"
                    : "text-foreground",
                )}
              >
                {message.content}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {new Date(message.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {message.role === "assistant" && (
                <MessageFeedback
                  messageId={message.id}
                  userId={userId}
                  existing={feedbackByMessage.get(message.id) ?? null}
                />
              )}
            </div>
          </div>
        ))}

        {pendingUser && (
          <div className="flex justify-end">
            <div className="inline-block max-w-[42rem] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground opacity-80">
              {pendingUser}
            </div>
          </div>
        )}

        {send.isPending && (
          <div className="max-w-[42rem] whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {streamed || (
              <span className="inline-flex items-center gap-1" aria-label="Writing a reply">
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
              </span>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface/70 p-3">
        <Textarea
          ref={composerRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Write as much or as little as you want…"
          rows={2}
          className="min-h-[3rem] resize-none border-0 bg-transparent p-1 text-sm shadow-none focus-visible:ring-0"
        />
        <div className="mt-1 flex items-center justify-end">
          <Button
            size="sm"
            onClick={submit}
            disabled={!draft.trim() || send.isPending}
            className="rounded-full"
          >
            <ArrowUp className="size-4" strokeWidth={2} />
            Send
          </Button>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Emotionala Ai is an AI system, not a therapist or emergency service. If you are in danger,
        contact local emergency services or someone you trust.
      </p>
    </div>
  );
}
