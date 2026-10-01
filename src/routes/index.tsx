import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, Clock3, Compass, ShieldCheck, Waves } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Emotionala Ai — AI that understands the conversation behind the conversation" },
      {
        name: "description",
        content:
          "An emotionally adaptive AI designed to understand context, recognize emotional patterns over time, and adapt how it interacts with you.",
      },
      {
        property: "og:title",
        content: "Emotionala Ai — AI that understands the conversation behind the conversation",
      },
      {
        property: "og:description",
        content:
          "An emotionally adaptive AI designed to understand context, recognize emotional patterns over time, and adapt how it interacts with you.",
      },
    ],
  }),
  component: Landing,
});

const pillars = [
  {
    icon: Waves,
    title: "Emotion-aware interaction",
    body: "The system analyzes conversational context and estimates emotional signals to determine an appropriate interaction strategy.",
  },
  {
    icon: Clock3,
    title: "Longitudinal understanding",
    body: "The system can maintain an evolving model of emotional patterns and important context rather than treating every conversation as isolated.",
  },
  {
    icon: Compass,
    title: "Adaptive support",
    body: "Different situations require different responses. The system may validate, ask questions, provide practical help, encourage reflection, or recommend reaching out to real-world support.",
  },
  {
    icon: ShieldCheck,
    title: "Safety by design",
    body: "The product includes a dedicated safety architecture for detecting concerning patterns and helping you access appropriate human support.",
  },
];

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/app", replace: true });
  }, [loading, user, navigate]);
  if (user) return null;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklab,var(--accent)_16%,transparent),transparent)]"
          />
          <div className="relative mx-auto w-full max-w-4xl px-5 py-24 text-center sm:px-8 sm:py-32">
            <p className="eyebrow fade-rise">Emotionally adaptive AI</p>
            <h1 className="display-heading fade-rise mt-6 text-4xl text-foreground sm:text-6xl">
              AI that understands the conversation behind the conversation.
            </h1>
            <p className="fade-rise mx-auto mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              An emotionally adaptive AI designed to understand context, recognize emotional
              patterns over time, and adapt how it interacts with you.
            </p>
            <div className="fade-rise mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full rounded-full sm:w-auto">
                <Link to="/auth">
                  Start a conversation
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full rounded-full sm:w-auto"
              >
                <Link to="/how-it-works">How it works</Link>
              </Button>
            </div>
            <p className="mt-8 text-xs text-muted-foreground">
              Not a medical device, therapist, or emergency service.
            </p>
          </div>
        </section>

        <div className="hairline mx-auto max-w-6xl" />

        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow">A different principle</p>
            <h2 className="display-heading mt-4 text-3xl text-foreground sm:text-4xl">
              Most systems optimize for answers. This one starts with context.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Understand the person and the emotional context behind the conversation, then
              determine how the AI should interact with them. Emotional signals are estimates, they
              are uncertain, and you can always correct them.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {pillars.map(({ icon: Icon, title, body }) => (
              <article key={title} className="panel p-7">
                <Icon className="size-5 text-accent" strokeWidth={1.6} />
                <h3 className="mt-5 text-lg font-medium text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
          <div className="panel flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div className="max-w-xl">
              <h2 className="display-heading text-2xl text-foreground sm:text-3xl">
                You stay in control of what is remembered.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Memory is visible and editable. Privacy controls are in plain sight. Safety
                escalation only happens with your explicit permission.
              </p>
            </div>
            <Button asChild size="lg" className="rounded-full">
              <Link to="/auth">
                Start a conversation
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            <strong className="font-medium text-foreground">
              This product is not a medical device, therapist, or emergency service.
            </strong>{" "}
            It does not diagnose conditions, replace professional care, or guarantee safety.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
