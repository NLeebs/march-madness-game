import { createSupabaseServerClient } from "@/infrastructure/db/supabaseServer";

/** The signed-in user's id, or null when there is no session or auth fails. Never throws. */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return error || !user ? null : user.id;
  } catch {
    return null;
  }
}
