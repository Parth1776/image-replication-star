import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/Wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface/50">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm space-y-3">
            <Wordmark />
            <p className="text-sm leading-relaxed text-muted-foreground">
              This product is not a medical device, therapist, or emergency service. If you are in
              immediate danger, contact local emergency services or a trusted person nearby.
            </p>
          </div>
          <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </Link>
            <Link to="/auth" className="transition-colors hover:text-foreground">
              Start a conversation
            </Link>
          </nav>
        </div>
        <p className="mt-10 text-xs text-muted-foreground">
          Emotional signals shown in this product are AI-generated estimates, not medical
          measurements or diagnoses.
        </p>
      </div>
    </footer>
  );
}
