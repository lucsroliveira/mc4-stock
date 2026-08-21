import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default async function LoginPage() {
  if (!hasSupabaseConfig()) {
    return (
      <main className="min-h-screen soft-grid px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-3xl rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Supabase não configurado no ambiente</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            No Vercel, configure as variáveis NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL) e
            NEXT_PUBLIC_SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para liberar o login.
          </p>
        </section>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen soft-grid px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col justify-center gap-8 lg:flex-row lg:items-center lg:justify-between">
        <section className="max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-left">
              <img src="/MC4 STOCK_ICONE.png" alt="Logo MC4" className="h-20 w-20" />
            </div>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-6xl">
            Controle de estoque com visão de operação, saldo e auditoria.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-[var(--foreground)] sm:text-lg">
            Seja bem vindo ao sistema arretado desenvolvido por Lucas Oliveira.
          </p>
        </section>

        <div className="w-full max-w-md space-y-4">
          <LoginForm />
          <div className="rounded-[1.5rem] border border-dashed border-orange-400/20 bg-white/70 p-6 text-sm leading-6 text-slate-700">
            <p className="font-semibold text-[#EB5727]">Fluxo integrado</p>
            <p className="mt-3">
              O login, os cadastros e as movimentações já estão conectados ao fluxo do estoque com identidade MC4.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}