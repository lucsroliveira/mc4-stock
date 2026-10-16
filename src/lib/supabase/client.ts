import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  // Acesso literal: o Next só embute NEXT_PUBLIC_* no bundle do navegador assim.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (ou PUBLISHABLE_KEY).");
  }

  return createBrowserClient(url, anonKey);
}