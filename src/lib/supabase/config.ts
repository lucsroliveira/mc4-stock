function getFirstDefinedEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function getSupabaseUrlFromEnv() {
  return getFirstDefinedEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]);
}

function getSupabasePublicKeyFromEnv() {
  return getFirstDefinedEnv([
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  ]);
}

export function hasSupabaseConfig() {
  const url = getSupabaseUrlFromEnv();
  const key = getSupabasePublicKeyFromEnv();

  if (!url || !key) {
    return false;
  }

  return !url.includes("your-project") && !key.includes("your-anon-key");
}

export function getSupabaseConfig() {
  const url = getSupabaseUrlFromEnv();
  const anonKey = getSupabasePublicKeyFromEnv();

  if (!hasSupabaseConfig() || !url || !anonKey) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL) e NEXT_PUBLIC_SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY com valores reais.",
    );
  }

  return { url, anonKey };
}