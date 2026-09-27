import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/how-it-works"
            className="hidden rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            How it works
          </Link>
          <ThemeToggle />
          <Button asChild size="sm" className="rounded-full">
            <Link to="/auth">Start a conversation</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
