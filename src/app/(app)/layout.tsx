import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { ToastProvider } from "@/components/toast-context"; // Importando o Provider

export type UserRole = "cliente" | "operador" | "admin";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!hasSupabaseConfig()) {
    return (
      <main className="min-h-screen soft-grid px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-3xl rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Configuração do Supabase pendente</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            Defina as variáveis de ambiente no Vercel para liberar acesso ao app: NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL), NEXT_PUBLIC_SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY e o bucket de storage.
          </p>
        </section>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    <ToastProvider>
      <AppShell userLabel={userLabel} userRole={userRole}>
        {children}
      </AppShell>
    </ToastProvider>
  );
}