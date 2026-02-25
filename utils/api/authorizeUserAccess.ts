import { createSupabaseServerClient } from "@/infrastructure/db/supabaseServer";
import { ForbiddenError, UnauthorizedError } from "@/utils/errorHandling";

export async function authorizeUserAccess(userId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user)
    throw new UnauthorizedError(
      "Authentication required to access user data",
      "UNAUTHORIZED_USER_ACCESS",
    );

  if (user.id !== userId)
    throw new ForbiddenError(
      "You are not allowed to access another user's data",
      "FORBIDDEN_USER_ACCESS",
    );
}
