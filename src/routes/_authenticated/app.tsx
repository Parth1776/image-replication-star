import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Brain,
  LifeBuoy,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  UserRound,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDisplayName } from "@/hooks/useDisplayName";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

type Conv = { id: string; title: string; updated_at: string };

function groupConversations(list: Conv[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 86400000;
  const groups: Record<string, Conv[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 days": [],
    Older: [],
  };
  for (const c of list) {
    const t = new Date(c.updated_at).getTime();
    const key =
      t >= startOfToday.getTime()
        ? "Today"
        : t >= startOfToday.getTime() - day
          ? "Yesterday"
          : t >= startOfToday.getTime() - 7 * day
            ? "Previous 7 days"
            : "Older";
    groups[key]!.push(c);
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

function useAvatarUrl() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as { avatar_url?: string; picture?: string } | undefined;
      setUrl(meta?.avatar_url ?? meta?.picture ?? null);
    });
  }, []);
  return url;
}

function Avatar({ initial, url }: { initial: string; url: string | null }) {
  return url ? (
    <img src={url} alt="" referrerPolicy="no-referrer" className="size-8 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
      {initial}
    </span>
  );
}

function SidebarBody({
  onNavigate,
  onSignOut,
  collapsed = false,
  onToggleCollapse,
}: {
  onNavigate: () => void;
  onSignOut: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const params = useParams({ strict: false }) as { conversationId?: string };
  const { firstName, initial } = useDisplayName();
  const avatarUrl = useAvatarUrl();
  const [searchOpen, setSearchOpen] = useState(false);

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
      onNavigate();
      navigate({ to: "/app/chat/$conversationId", params: { conversationId: id } });
    },
    onError: () => toast.error("Could not start a new conversation."),
  });

  const q = search.trim().toLowerCase();
  const filtered = (conversations.data ?? []).filter((c) => c.title.toLowerCase().includes(q));
  const grouped = groupConversations(filtered);

  const menuItem = "gap-2.5 py-2 text-sm";

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center pt-4", collapsed ? "flex-col gap-3 px-2" : "justify-between px-4")}>
        {!collapsed && (
          <Link to="/app" onClick={onNavigate} className="block px-2">
            <Wordmark />
          </Link>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="size-4" strokeWidth={1.6} /> : <PanelLeftClose className="size-4" strokeWidth={1.6} />}
          </button>
        )}
      </div>

      {collapsed ? (
        <div className="flex flex-1 flex-col items-center gap-2 px-2 pt-4">
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending}
            aria-label="New conversation"
            title="New conversation"
            className="grid size-9 place-items-center rounded-lg text-foreground transition-colors hover:bg-sidebar-accent"
          >
            <Plus className="size-4" strokeWidth={1.7} />
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchOpen(true);
              onToggleCollapse?.();
            }}
            aria-label="Search conversations"
            title="Search conversations"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <Search className="size-4" strokeWidth={1.7} />
          </button>
        </div>
      ) : (
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-4">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-sidebar-accent disabled:opacity-60"
          >
            <Plus className="size-4" strokeWidth={1.7} />
            New conversation
          </button>
          <div className="relative px-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus={searchOpen}
              placeholder="Search conversations"
              aria-label="Search conversations"
              className="h-8 bg-transparent pl-8 text-sm"
            />
          </div>

          <div className="pt-2">
            {conversations.isLoading && (
              <p className="px-3 text-xs text-muted-foreground">Loading…</p>
            )}
            {!conversations.isLoading && filtered.length === 0 && (
              <p className="px-3 text-xs text-muted-foreground">
                {q ? "No matching conversations." : "No conversations yet."}
              </p>
            )}
            {grouped.map(([label, items]) => (
              <div key={label} className="mb-3">
                <p className="px-3 pb-1 text-[11px] font-medium text-muted-foreground">{label}</p>
                {items.map((c) => (
                  <Link
                    key={c.id}
                    to="/app/chat/$conversationId"
                    params={{ conversationId: c.id }}
                    onClick={onNavigate}
                    className={cn(
                      "block truncate rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                      params.conversationId === c.id && "bg-sidebar-accent text-foreground",
                    )}
                  >
                    {c.title}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-3")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className={cn(
                "flex w-full items-center gap-3 rounded-lg py-2 text-left transition-colors hover:bg-sidebar-accent",
                collapsed ? "justify-center px-0" : "px-2",
              )}
            >
              <Avatar initial={initial} url={avatarUrl} />
              <span className={cn("min-w-0", collapsed && "sr-only")}>
                <span className="block truncate text-sm font-medium text-foreground">
                  {firstName ?? "Account"}
                </span>
                <span className="block text-[11px] text-muted-foreground">Account</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-60">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar initial={initial} url={avatarUrl} />
              <span>
                <span className="block text-sm font-medium">{firstName ?? "Account"}</span>
                <span className="block text-[11px] text-muted-foreground">Account</span>
              </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className={menuItem}>
              <Link to="/app/settings" onClick={onNavigate}><UserRound className="size-4" />Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={menuItem}>
              <Link to="/app/personalization" onClick={onNavigate}><SlidersHorizontal className="size-4" />Personalization</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={menuItem}>
              <Link to="/app/memory" onClick={onNavigate}><Brain className="size-4" />Memory</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={menuItem}>
              <Link to="/app/safety" onClick={onNavigate}><LifeBuoy className="size-4" />Safety Centre</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={menuItem}>
              <Link to="/app/settings" onClick={onNavigate}><Settings className="size-4" />Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className={menuItem}>
              <Link to="/how-it-works" onClick={onNavigate}><HelpCircle className="size-4" />Help & Support</Link>
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItem} onSelect={onSignOut}>
              <LogOut className="size-4" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(localStorage.getItem("emotionala-sidebar") === "collapsed");
  }, []);
  function toggleCollapse() {
    setCollapsed((current) => {
      localStorage.setItem("emotionala-sidebar", current ? "expanded" : "collapsed");
      return !current;
    });
  }
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    setMenuOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={cn(
          "hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:block",
          collapsed ? "w-14" : "w-64",
        )}
      >
        <SidebarBody
          onNavigate={() => {}}
          onSignOut={handleSignOut}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody onNavigate={() => setMenuOpen(false)} onSignOut={handleSignOut} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:justify-end lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground"
            >
              <Menu className="size-4" />
            </button>
            <Wordmark compact />
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
