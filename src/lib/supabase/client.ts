import { createBrowserClient } from "@supabase/ssr";
import { createFallbackSupabaseClient, hasSupabaseConfig, shouldUseFallbackSupabase } from "./fallback";

export function createSupabaseBrowserClient() {
  if (!hasSupabaseConfig()) {
    if (!shouldUseFallbackSupabase()) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY precisam estar configurados no ambiente de produção.");
    }

    return createFallbackSupabaseClient() as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}