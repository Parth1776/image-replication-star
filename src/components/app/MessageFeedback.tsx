import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const REASONS = [
  { value: "misunderstood", label: "It misunderstood me" },
  { value: "too_much_advice", label: "Too much advice" },
  { value: "too_generic", label: "Too generic" },
  { value: "wanted_listening", label: "I wanted someone to listen" },
  { value: "wanted_practical", label: "I wanted practical help" },
  { value: "other", label: "Something else" },
];

export function MessageFeedback({
  messageId,
  userId,
  existing,
}: {
  messageId: string;
  userId: string;
  existing?: { rating: string; reason: string | null } | null;
}) {
  const queryClient = useQueryClient();
  const [askReason, setAskReason] = useState(false);

  const submit = useMutation({
    mutationFn: async (input: { rating: "helpful" | "not_helpful"; reason?: string }) => {
      const { error } = await supabase.from("feedback").upsert(
        {
          user_id: userId,
          message_id: messageId,
          rating: input.rating,
          reason: input.reason ?? null,
        },
        { onConflict: "message_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feedback"] }),
    onError: () => toast.error("That didn't save. Please try again."),
  });

  const rating = existing?.rating;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-1 opacity-70 transition-opacity focus-within:opacity-100 hover:opacity-100">
        <button
          type="button"
          aria-label="Helpful"
          onClick={() => submit.mutate({ rating: "helpful" })}
          className={cn(
            "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface",
            rating === "helpful" && "bg-surface text-foreground",
          )}
        >
          <ThumbsUp className="size-3.5" strokeWidth={1.7} />
        </button>
        <button
          type="button"
          aria-label="Not helpful"
          onClick={() => {
            submit.mutate({ rating: "not_helpful" });
            setAskReason(true);
          }}
          className={cn(
            "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface",
            rating === "not_helpful" && "bg-surface text-foreground",
          )}
        >
          <ThumbsDown className="size-3.5" strokeWidth={1.7} />
        </button>
      </div>

      {askReason && rating === "not_helpful" && !existing?.reason && (
        <div className="rounded-lg border border-border bg-surface/60 p-3">
          <p className="text-xs text-muted-foreground">What didn't feel right?</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REASONS.map((reason) => (
              <Button
                key={reason.value}
                variant="outline"
                size="sm"
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => {
                  submit.mutate({ rating: "not_helpful", reason: reason.value });
                  setAskReason(false);
                }}
              >
                {reason.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
