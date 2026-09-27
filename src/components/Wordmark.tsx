export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="relative grid size-7 place-items-center rounded-full border border-border bg-surface"
      >
        <span className="size-2.5 rounded-full bg-accent" />
        <span className="absolute inset-0 rounded-full border border-accent/30" />
      </span>
      {!compact && (
        <span className="display-heading text-lg tracking-tight text-foreground">
          Emotionala <span className="italic text-muted-foreground">Ai</span>
        </span>
      )}
    </span>
  );
}
