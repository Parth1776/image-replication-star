import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Presentation-only: derives a first name from the existing profile / session. */
export function firstName(full?: string | null): string | null {
  const trimmed = full?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

export function useDisplayName() {
  const { user } = useAuth();
  const profile = useQuery({
    queryKey: ["profile-name", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name").maybeSingle();
      return data?.display_name ?? null;
    },
  });
  const meta = user?.user_metadata as Record<string, string | undefined> | undefined;
  const full =
    profile.data ?? meta?.["display_name"] ?? meta?.["full_name"] ?? meta?.["name"] ?? null;
  const first = firstName(full) ?? user?.email?.split("@")[0] ?? null;
  return { user, firstName: first, initial: (first ?? "?").charAt(0).toUpperCase() };
}
