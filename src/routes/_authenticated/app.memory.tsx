import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { EstimateNote, PageIntro } from "@/components/app/EstimateNote";
import { MEMORY_CATEGORIES } from "@/lib/signals";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/memory")({
  head: () => ({
    meta: [
      { title: "Memory — Emotionala Ai" },
      {
        name: "description",
        content: "Everything the system remembers about you, fully editable and deletable.",
      },
      { property: "og:title", content: "Memory — Emotionala Ai" },
      {
        property: "og:description",
        content: "Everything the system remembers about you, fully editable and deletable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemoryPage,
});

type Category = (typeof MEMORY_CATEGORIES)[number]["value"];

function MemoryPage() {
  const queryClient = useQueryClient();
  const [newCategory, setNewCategory] = useState<Category>("personal_context");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const memories = useQuery({
    queryKey: ["memories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memories")
        .select("id, category, content, created_at, source_conversation_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["memories"] });

  const add = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      const { error } = await supabase
        .from("memories")
        .insert({ user_id: userId, category: newCategory, content: newContent.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewContent("");
      invalidate();
    },
    onError: () => toast.error("Could not save that."),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; content: string }) => {
      const { error } = await supabase
        .from("memories")
        .update({ content: input.content })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: () => toast.error("Could not update that."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("memories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("Could not delete that."),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      const { error } = await supabase.from("memories").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All memories cleared.");
      invalidate();
    },
    onError: () => toast.error("Could not clear memories."),
  });

  const list = memories.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageIntro
        eyebrow="What you've mentioned"
        title="Memory"
        description="This is everything the system keeps as context. Edit or delete anything, at any time."
        action={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                Clear all memories
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all memories?</AlertDialogTitle>
                <AlertDialogDescription>
                  Every remembered detail is permanently deleted. Your conversations stay as they
                  are.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => clearAll.mutate()}>
                  Clear everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />

      <EstimateNote>
        Memory is used only to keep conversations coherent. Nothing here is a clinical record, and
        you can turn memory off entirely in Settings.
      </EstimateNote>

      <div className="panel space-y-3 p-5">
        <h2 className="text-sm font-medium text-foreground">Add something to remember</h2>
        <Select value={newCategory} onValueChange={(value) => setNewCategory(value as Category)}>
          <SelectTrigger className="w-full sm:w-64" aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEMORY_CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          value={newContent}
          onChange={(event) => setNewContent(event.target.value)}
          placeholder="e.g. Prefers short replies when tired"
          rows={2}
        />
        <Button
          size="sm"
          onClick={() => add.mutate()}
          disabled={!newContent.trim() || add.isPending}
        >
          Save
        </Button>
      </div>

      <div className="space-y-3">
        {memories.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!memories.isLoading && list.length === 0 && (
          <div className="panel p-6 text-sm text-muted-foreground">Nothing remembered yet.</div>
        )}
        {list.map((memory) => (
          <article key={memory.id} className="panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow">
                  {MEMORY_CATEGORIES.find((category) => category.value === memory.category)
                    ?.label ?? memory.category}
                </p>
                {editingId === memory.id ? (
                  <div className="mt-2">
                    <Input
                      value={editingContent}
                      onChange={(event) => setEditingContent(event.target.value)}
                      aria-label="Memory content"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          update.mutate({ id: memory.id, content: editingContent.trim() })
                        }
                        disabled={!editingContent.trim()}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-foreground">{memory.content}</p>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Added {new Date(memory.created_at).toLocaleDateString()}
                  {memory.source_conversation_id ? " · from a conversation" : " · added by you"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label="Edit memory"
                  onClick={() => {
                    setEditingId(memory.id);
                    setEditingContent(memory.content);
                  }}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  <Pencil className="size-3.5" strokeWidth={1.7} />
                </button>
                <button
                  type="button"
                  aria-label="Delete memory"
                  onClick={() => remove.mutate(memory.id)}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.7} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
