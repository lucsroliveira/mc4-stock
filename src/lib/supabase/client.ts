import { createBrowserClient } from "@supabase/ssr";
import { createFallbackSupabaseClient, hasSupabaseConfig } from "./fallback";

export function createSupabaseBrowserClient() {
  if (!hasSupabaseConfig()) {
    return createFallbackSupabaseClient() as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}