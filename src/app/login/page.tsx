import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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
    <main className="login-shell soft-grid">
      <section className="login-brand">
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <img
            src="/MC4 STOCK_ICONE.png"
            alt="Logo MC4"
            width={48}
            height={48}
            style={{ height: 48, width: 48, borderRadius: 12, background: "#fff", padding: 4 }}
          />
          <span style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "0.02em" }}>MC4 Stock</span>
        </div>

        <div style={{ maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "2.75rem", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Controle de estoque com visão de operação, saldo e auditoria.
          </h1>
          <ul style={{ marginTop: "2.5rem", display: "grid", gap: "1.25rem", listStyle: "none", padding: 0 }}>
            {[
              ["Saldo em tempo real", "Acompanhe entradas, saídas e transferências entre estoques."],
              ["Histórico auditável", "Toda movimentação fica registrada com data e responsável."],
              ["Relatórios e exportações", "Consulte e exporte dados em CSV e PDF em poucos cliques."],
            ].map(([title, text]) => (
              <li key={title} className="login-feature">
                <span className="login-feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <span>
                  <strong style={{ display: "block", fontSize: "1rem" }}>{title}</strong>
                  <span style={{ fontSize: "0.9rem", opacity: 0.85 }}>{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p style={{ fontSize: "0.8rem", opacity: 0.8 }}>© {new Date().getFullYear()} MC4 · Desenvolvido por Lucas Oliveira</p>
      </section>

      <section className="login-panel">
        <div style={{ width: "100%", maxWidth: "26rem" }}>
          <div className="login-mobile-logo">
            <img src="/MC4 STOCK_ICONE.png" alt="Logo MC4" width={64} height={64} style={{ height: 64, width: 64 }} />
            <span style={{ marginTop: "0.5rem", fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)" }}>MC4 Stock</span>
          </div>
          <LoginForm authError={error === "auth-failed"} />
          <p style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Acesso restrito a colaboradores MC4. Precisa de ajuda? Fale com o administrador.
          </p>
        </div>
      </section>
    </main>
  );
}