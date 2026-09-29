import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/chat")({
  head: () => ({
    meta: [
      { title: "Conversation — Emotionala Ai" },
      {
        name: "description",
        content:
          "A private, emotionally adaptive conversation that keeps track of context over time.",
      },
      { property: "og:title", content: "Conversation — Emotionala Ai" },
      {
        property: "og:description",
        content: "A private, emotionally adaptive conversation space.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatLayout,
});

function ChatLayout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const params = useParams({ strict: false }) as { conversationId?: string };

  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, updated_at, interaction_mode")
        .eq("archived", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title: "New conversation" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      navigate({ to: "/app/chat/$conversationId", params: { conversationId: id } });
    },
    onError: () => toast.error("Could not start a new conversation."),
  });

  const filtered = (conversations.data ?? []).filter((conversation) =>
    conversation.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="space-y-3">
        <Button
          className="w-full justify-start"
          variant="outline"
          onClick={() => create.mutate()}
          disabled={create.isPending}
        >
          <Plus className="size-4" strokeWidth={1.7} />
          New conversation
        </Button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations"
            className="pl-9"
            aria-label="Search conversations"
          />
        </div>
        <div className="space-y-1">
          {conversations.isLoading && (
            <p className="px-1 text-xs text-muted-foreground">Loading…</p>
          )}
          {!conversations.isLoading && filtered.length === 0 && (
            <p className="px-1 text-xs text-muted-foreground">No conversations yet.</p>
          )}
          {filtered.map((conversation) => (
            <Link
              key={conversation.id}
              to="/app/chat/$conversationId"
              params={{ conversationId: conversation.id }}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground",
                params.conversationId === conversation.id && "bg-surface text-foreground",
              )}
            >
              <span className="line-clamp-1">{conversation.title}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {new Date(conversation.updated_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      </aside>

      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
}
