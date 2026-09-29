import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  BookMarked,
  LifeBuoy,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  Sparkle,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

const NAV = [
  { to: "/app", label: "Overview", icon: Sparkle, exact: true },
  { to: "/app/chat", label: "Conversation", icon: MessageCircle },
  { to: "/app/timeline", label: "Timeline", icon: Activity },
  { to: "/app/insights", label: "Insights", icon: BookMarked },
  { to: "/app/memory", label: "Memory", icon: BookMarked },
  { to: "/app/safety", label: "Safety centre", icon: LifeBuoy },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: "exact" in item ? item.exact : false }}
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          activeProps={{ className: "bg-sidebar-accent text-foreground" }}
        >
          <item.icon className="size-4" strokeWidth={1.6} />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <div>
          <Link to="/" className="block px-2">
            <Wordmark />
          </Link>
          <div className="mt-8">{nav}</div>
        </div>
        <div className="space-y-3 px-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-muted-foreground"
          >
            <LogOut className="size-4" strokeWidth={1.6} />
            Sign out
          </Button>
          <p className="px-2 text-[11px] leading-relaxed text-muted-foreground">
            Not a medical device, therapist, or emergency service.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:justify-end lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
              className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground"
            >
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
            <Wordmark compact />
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/app/chat">Start a conversation</Link>
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {menuOpen && (
          <div className="border-b border-border bg-sidebar px-4 py-4 lg:hidden">
            {nav}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="mt-2 w-full justify-start text-muted-foreground"
            >
              <LogOut className="size-4" strokeWidth={1.6} />
              Sign out
            </Button>
          </div>
        )}

        <main className={cn("flex-1 px-4 py-8 lg:px-8")}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
