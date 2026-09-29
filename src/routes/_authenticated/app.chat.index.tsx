import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/chat/")({
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();

  const start = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("archived", false)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) return existing.id;
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title: "New conversation" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) =>
      navigate({ to: "/app/chat/$conversationId", params: { conversationId: id } }),
    onError: () => toast.error("Could not open a conversation."),
  });

  return (
    <div className="fade-rise max-w-lg pt-10">
      <h1 className="display-heading text-3xl tracking-tight text-foreground">
        Start where you are
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Conversations stay private to your account. You decide what is remembered, and you can
        correct anything the system gets wrong.
      </p>
      <Button className="mt-6" onClick={() => start.mutate()} disabled={start.isPending}>
        {start.isPending ? "Opening…" : "Start a conversation"}
      </Button>
    </div>
  );
}
