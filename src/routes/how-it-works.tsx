import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — Emotionala Ai" },
      {
        name: "description",
        content:
          "How Emotionala Ai estimates emotional context, adapts its interaction strategy, and keeps safety and memory under your control.",
      },
      { property: "og:title", content: "How it works — Emotionala Ai" },
      {
        property: "og:description",
        content:
          "How Emotionala Ai estimates emotional context, adapts its interaction strategy, and keeps safety and memory under your control.",
      },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  {
    step: "01",
    title: "The conversation is read in context",
    body: "Each message is considered alongside recent conversations and the context you have chosen to keep, instead of being treated as an isolated question.",
  },
  {
    step: "02",
    title: "Emotional signals are estimated",
    body: "Dedicated components estimate signals such as stress, sadness, frustration or positive engagement, plus emotional intensity and confidence. These estimates are never shown to you as raw numbers inside a conversation.",
  },
  {
    step: "03",
    title: "An interaction strategy is selected",
    body: "An interaction policy decides whether to listen and validate, ask a question, offer practical help, encourage reflection, or recommend real-world support.",
  },
  {
    step: "04",
    title: "Safety is evaluated separately",
    body: "A separate safety layer looks for signs of significant distress. If your settings allow it, the conversation can shift into a calmer, safety-focused interaction that surfaces real-world support.",
  },
  {
    step: "05",
    title: "You correct the system",
    body: "Insights can be marked accurate or not, replies can be marked helpful or not, and memory can be edited or cleared at any time.",
  },
];

function HowItWorks() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="eyebrow">How it works</p>
          <h1 className="display-heading mt-5 text-4xl text-foreground sm:text-5xl">
            Understanding first, then response.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            Emotionala Ai is built as a set of separate components rather than one general-purpose
            model. Emotion understanding, intent detection, distress detection, trajectory analysis
            and interaction strategy are distinct parts of the system.
          </p>
          <Badge variant="outline" className="mt-6 rounded-full font-normal">
            Custom emotion models are in development — not yet connected
          </Badge>

          <ol className="mt-14 space-y-5">
            {steps.map(({ step, title, body }) => (
              <li key={step} className="panel p-7">
                <span className="eyebrow">{step}</span>
                <h2 className="mt-3 text-lg font-medium text-foreground">{title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>

          <div className="panel mt-12 p-7">
            <h2 className="text-lg font-medium text-foreground">What this product does not do</h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>It does not diagnose mental illness or label you with a condition.</li>
              <li>It does not replace a therapist, doctor or crisis service.</li>
              <li>It cannot perfectly understand emotions, and it can be wrong.</li>
              <li>It cannot guarantee safety.</li>
              <li>It will never contact anyone on your behalf without your explicit permission.</li>
            </ul>
          </div>

          <div className="mt-12">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/auth">Start a conversation</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
