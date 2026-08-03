import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createFallbackSupabaseClient, hasSupabaseConfig } from "./fallback";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  if (!hasSupabaseConfig()) {
    return createFallbackSupabaseClient(cookieStore) as ReturnType<typeof createServerClient>;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          return undefined;
        },
      },
    },
  );
}