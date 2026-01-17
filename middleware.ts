import { type NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/utils/supabase";

export async function middleware(request: NextRequest) {
  return await refreshSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
