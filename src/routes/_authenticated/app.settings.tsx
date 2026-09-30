import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageIntro } from "@/components/app/EstimateNote";
import { COMMUNICATION_STYLES } from "@/lib/signals";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Emotionala Ai" },
      {
        name: "description",
        content: "Account, privacy, personalisation, safety, and data controls.",
      },
      { property: "og:title", content: "Settings — Emotionala Ai" },
      {
        property: "og:description",
        content: "Account, privacy, personalisation, safety, and data controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [style, setStyle] = useState("conversational");
  const [privacy, setPrivacy] = useState({
    store_conversations: true,
    memory_enabled: true,
    analytics_enabled: false,
    model_improvement_enabled: false,
  });

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!profile.data) return;
    setDisplayName(profile.data.display_name ?? "");
    setStyle(profile.data.communication_style);
    setPrivacy({
      store_conversations: profile.data.store_conversations,
      memory_enabled: profile.data.memory_enabled,
      analytics_enabled: profile.data.analytics_enabled,
      model_improvement_enabled: profile.data.model_improvement_enabled,
    });
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!user) throw new Error("Please sign in again.");
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
      const consentKeys = Object.keys(patch).filter((key) =>
        ["analytics_enabled", "model_improvement_enabled", "store_conversations", "memory_enabled"].includes(
          key,
        ),
      );
      if (consentKeys.length) {
        await supabase.from("consent_records").insert(
          consentKeys.map((key) => ({
            user_id: user.id,
            consent_type: key,
            granted: Boolean(patch[key]),
          })),
        );
      }
    },
    onSuccess: () => {
      toast.success("Saved.");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Could not save that."),
  });

  const exportData = useMutation({
    mutationFn: async () => {
      const tables = [
        "profiles",
        "conversations",
        "messages",
        "memories",
        "emotional_events",
        "insights",
        "feedback",
        "safety_plans",
        "trusted_contacts",
        "consent_records",
      ] as const;
      const bundle: Record<string, unknown> = { exported_at: new Date().toISOString() };
      for (const table of tables) {
        const { data } = await supabase.from(table).select("*");
        bundle[table] = data ?? [];
      }
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "emotionala-ai-export.json";
      link.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error("Could not build your export."),
  });

  const deleteConversations = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in again.");
      await supabase.from("conversations").delete().eq("user_id", user.id);
    },
    onSuccess: () => {
      toast.success("Conversations deleted.");
      queryClient.invalidateQueries();
    },
    onError: () => toast.error("Could not delete your conversations."),
  });

  const deleteEverything = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in again.");
      await supabase.from("conversations").delete().eq("user_id", user.id);
      await supabase.from("memories").delete().eq("user_id", user.id);
      await supabase.from("insights").delete().eq("user_id", user.id);
      await supabase.from("emotional_events").delete().eq("user_id", user.id);
      await supabase.from("trusted_contacts").delete().eq("user_id", user.id);
      await supabase.from("safety_plans").delete().eq("user_id", user.id);
      await supabase
        .from("audit_logs")
        .insert({ user_id: user.id, action: "account_data_deleted", detail: {} });
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      toast.success("Your data has been deleted and you've been signed out.");
      navigate({ to: "/", replace: true });
    },
    onError: () => toast.error("Could not delete your data."),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageIntro
        eyebrow="Settings"
        title="Your account and controls"
        description="Privacy and memory controls are deliberately front and centre."
      />

      <section className="panel space-y-4 p-5">
        <h2 className="text-sm font-medium text-foreground">Account</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled />
          </div>
        </div>
        <Button size="sm" onClick={() => save.mutate({ display_name: displayName.trim() || null })}>
          Save account details
        </Button>
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="text-sm font-medium text-foreground">Privacy</h2>
        {(
          [
            {
              key: "store_conversations",
              label: "Store my conversations",
              hint: "Needed to keep context between sessions.",
            },
            {
              key: "memory_enabled",
              label: "Use memory",
              hint: "Lets conversations refer back to what matters to you.",
            },
            {
              key: "analytics_enabled",
              label: "Product analytics",
              hint: "Off by default. Anonymous usage only, never conversation content.",
            },
            {
              key: "model_improvement_enabled",
              label: "Use my feedback to improve models",
              hint: "Off by default. Only your Helpful / Not helpful ratings.",
            },
          ] as const
        ).map((item) => (
          <div key={item.key} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-foreground">{item.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            </div>
            <Switch
              checked={privacy[item.key]}
              aria-label={item.label}
              onCheckedChange={(checked) => {
                setPrivacy((state) => ({ ...state, [item.key]: checked }));
                save.mutate({ [item.key]: checked });
              }}
            />
          </div>
        ))}
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="text-sm font-medium text-foreground">Personalisation</h2>
        <p className="text-xs text-muted-foreground">How would you like replies to sound?</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {COMMUNICATION_STYLES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setStyle(option.value);
                save.mutate({ communication_style: option.value });
              }}
              className={cn(
                "rounded-xl border border-border px-4 py-3 text-left transition-colors hover:bg-surface",
                style === option.value && "border-accent/60 bg-surface",
              )}
            >
              <span className="block text-sm text-foreground">{option.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel space-y-2 p-5">
        <h2 className="text-sm font-medium text-foreground">Safety</h2>
        <p className="text-sm text-muted-foreground">
          Your safety plan, trusted contacts, and escalation permissions live in the{" "}
          <Link to="/app/safety" className="text-foreground underline underline-offset-4">
            safety centre
          </Link>
          .
        </p>
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="text-sm font-medium text-foreground">Your data</h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => exportData.mutate()}>
            Export my data
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/memory">Manage memories</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline">
                Delete all conversations
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all conversations?</AlertDialogTitle>
                <AlertDialogDescription>
                  Every conversation and its messages are permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteConversations.mutate()}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                Delete my data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete everything?</AlertDialogTitle>
                <AlertDialogDescription>
                  Conversations, memories, insights, events, safety plan and trusted contacts are
                  permanently deleted, and you'll be signed out.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteEverything.mutate()}>
                  Delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <p className="text-xs text-muted-foreground">
          Deleting data cannot be undone. Your exported file contains your own records only.
        </p>
      </section>
    </div>
  );
}
