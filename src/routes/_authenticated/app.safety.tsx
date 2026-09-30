import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EstimateNote, PageIntro } from "@/components/app/EstimateNote";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/safety")({
  head: () => ({
    meta: [
      { title: "Safety centre — Emotionala Ai" },
      {
        name: "description",
        content:
          "Your safety plan, trusted contacts, and the resources you want surfaced when things get hard.",
      },
      { property: "og:title", content: "Safety centre — Emotionala Ai" },
      {
        property: "og:description",
        content: "Your safety plan, trusted contacts, and preferred resources.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SafetyPage,
});

function SafetyPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    professional_support: "",
    preferred_resources: "",
    region: "",
    notes: "",
    escalation_authorized: false,
    safety_mode_enabled: true,
  });
  const [contact, setContact] = useState({ name: "", relationship: "", contact_method: "" });

  const plan = useQuery({
    queryKey: ["safety-plan"],
    queryFn: async () => {
      const { data, error } = await supabase.from("safety_plans").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const contacts = useQuery({
    queryKey: ["trusted-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trusted_contacts")
        .select("id, name, relationship, contact_method")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!plan.data) return;
    setForm({
      professional_support: plan.data.professional_support ?? "",
      preferred_resources: plan.data.preferred_resources ?? "",
      region: plan.data.region ?? "",
      notes: plan.data.notes ?? "",
      escalation_authorized: plan.data.escalation_authorized,
      safety_mode_enabled: plan.data.safety_mode_enabled,
    });
  }, [plan.data]);

  const savePlan = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      const { error } = await supabase
        .from("safety_plans")
        .upsert({ user_id: userId, ...form }, { onConflict: "user_id" });
      if (error) throw error;
      await supabase
        .from("audit_logs")
        .insert({ user_id: userId, action: "safety_plan_updated", detail: {} });
    },
    onSuccess: () => {
      toast.success("Safety plan saved.");
      queryClient.invalidateQueries({ queryKey: ["safety-plan"] });
    },
    onError: () => toast.error("Could not save your safety plan."),
  });

  const addContact = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      const { error } = await supabase.from("trusted_contacts").insert({
        user_id: userId,
        name: contact.name.trim(),
        relationship: contact.relationship.trim() || null,
        contact_method: contact.contact_method.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContact({ name: "", relationship: "", contact_method: "" });
      queryClient.invalidateQueries({ queryKey: ["trusted-contacts"] });
    },
    onError: () => toast.error("Could not save that contact."),
  });

  const removeContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trusted_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trusted-contacts"] }),
    onError: () => toast.error("Could not remove that contact."),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageIntro
        eyebrow="Safety by design"
        title="Safety centre"
        description="A calm place to decide, in advance, what should happen if a conversation gets heavy."
      />

      <EstimateNote>
        Nobody is contacted automatically. Emotionala Ai will never call, message, or notify anyone on
        your behalf unless you explicitly turn that on, and it is never an emergency service.
      </EstimateNote>

      <section className="panel space-y-4 p-5">
        <h2 className="text-sm font-medium text-foreground">Your safety plan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="professional">Professional support</Label>
            <Input
              id="professional"
              value={form.professional_support}
              onChange={(event) =>
                setForm((state) => ({ ...state, professional_support: event.target.value }))
              }
              placeholder="Therapist, GP, or clinic"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="region">Your region</Label>
            <Input
              id="region"
              value={form.region}
              onChange={(event) => setForm((state) => ({ ...state, region: event.target.value }))}
              placeholder="Country or city"
            />
            <p className="text-[11px] text-muted-foreground">
              Used only to surface resources relevant to where you are.
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="resources">Preferred emergency resources</Label>
          <Textarea
            id="resources"
            rows={3}
            value={form.preferred_resources}
            onChange={(event) =>
              setForm((state) => ({ ...state, preferred_resources: event.target.value }))
            }
            placeholder="The helplines, services, or numbers you would actually want to see."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Anything else that helps</Label>
          <Textarea
            id="notes"
            rows={2}
            value={form.notes}
            onChange={(event) => setForm((state) => ({ ...state, notes: event.target.value }))}
            placeholder="What usually helps you, or what to avoid."
          />
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-foreground">Safety mode</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                When a conversation looks like it is getting hard, it shifts to a simpler,
                safety-focused way of talking and shows your plan. This is not a diagnosis and never
                locks you out.
              </p>
            </div>
            <Switch
              checked={form.safety_mode_enabled}
              onCheckedChange={(checked) =>
                setForm((state) => ({ ...state, safety_mode_enabled: checked }))
              }
              aria-label="Safety mode"
            />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-foreground">Allow escalation to a trusted contact</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Off by default. Even when on, nothing happens without an explicit safety policy and
                your permission at the time.
              </p>
            </div>
            <Switch
              checked={form.escalation_authorized}
              onCheckedChange={(checked) =>
                setForm((state) => ({ ...state, escalation_authorized: checked }))
              }
              aria-label="Allow escalation"
            />
          </div>
        </div>

        <Button onClick={() => savePlan.mutate()} disabled={savePlan.isPending}>
          Save safety plan
        </Button>
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="text-sm font-medium text-foreground">Trusted contacts</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            value={contact.name}
            onChange={(event) => setContact((state) => ({ ...state, name: event.target.value }))}
            placeholder="Name"
            aria-label="Contact name"
          />
          <Input
            value={contact.relationship}
            onChange={(event) =>
              setContact((state) => ({ ...state, relationship: event.target.value }))
            }
            placeholder="Relationship"
            aria-label="Relationship"
          />
          <Input
            value={contact.contact_method}
            onChange={(event) =>
              setContact((state) => ({ ...state, contact_method: event.target.value }))
            }
            placeholder="Phone or email"
            aria-label="Contact method"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => addContact.mutate()}
          disabled={!contact.name.trim() || addContact.isPending}
        >
          Add contact
        </Button>

        <ul className="space-y-2 text-sm">
          {(contacts.data ?? []).map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <span className="min-w-0">
                <span className="text-foreground">{row.name}</span>
                {row.relationship && (
                  <span className="text-muted-foreground"> · {row.relationship}</span>
                )}
                {row.contact_method && (
                  <span className="block text-[11px] text-muted-foreground">
                    {row.contact_method}
                  </span>
                )}
              </span>
              <button
                type="button"
                aria-label={`Remove ${row.name}`}
                onClick={() => removeContact.mutate(row.id)}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground"
              >
                <Trash2 className="size-3.5" strokeWidth={1.7} />
              </button>
            </li>
          ))}
          {(contacts.data ?? []).length === 0 && (
            <li className="text-muted-foreground">No trusted contacts saved.</li>
          )}
        </ul>
      </section>

      <section className="panel p-5">
        <h2 className="text-sm font-medium text-foreground">If you need help right now</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Emotionala Ai is not an emergency service. If you are in immediate danger, contact your
          local emergency number or go to the nearest emergency department. Emergency resources are
          configured per region — save the ones you want above, and location-appropriate resources
          will be provided by the backend as that service is connected.
        </p>
      </section>
    </div>
  );
}
