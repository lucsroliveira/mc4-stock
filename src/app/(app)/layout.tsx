import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserRole = "cliente" | "operador" | "admin";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Busca o perfil e a role correspondente ao usuário logado na tabela profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  const userLabel = profile?.full_name ?? user.user_metadata?.full_name ?? profile?.email ?? user.email ?? "Usuário";
  const userRole = (profile?.role ?? "cliente") as UserRole;

  return (
    <AppShell userLabel={userLabel} userRole={userRole}>
      {children}
    </AppShell>
  );
}