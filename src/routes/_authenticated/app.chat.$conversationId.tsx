import { createFileRoute } from "@tanstack/react-router";
import { ChatWindow } from "@/components/app/ChatWindow";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/app/chat/$conversationId")({
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const { user, loading } = useAuth();

  if (loading || !user) {
    return <p className="pt-10 text-sm text-muted-foreground">Loading your conversation…</p>;
  }

  return <ChatWindow key={conversationId} conversationId={conversationId} userId={user.id} />;
}
