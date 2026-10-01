import { createFileRoute, Outlet } from "@tanstack/react-router";

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

// Conversation history now lives in the app sidebar.
function ChatLayout() {
  return (
    <section className="mx-auto min-w-0 max-w-3xl">
      <Outlet />
    </section>
  );
}
