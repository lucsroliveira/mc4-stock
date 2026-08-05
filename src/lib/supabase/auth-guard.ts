import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserRole = "cliente" | "operador" | "admin";

export async function getCurrentUserRole(): Promise<UserRole> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return "cliente";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role ?? "cliente";
}

export async function assertUserRole(allowedRoles: UserRole[]) {
  const role = await getCurrentUserRole();
  if (!allowedRoles.includes(role)) {
    throw new Error("Acesso negado: a sua conta não possui permissão para realizar esta operação.");
  }
  return role;
}