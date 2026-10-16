"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function MicrosoftLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 23 23" width="20" height="20" className="h-5 w-5 shrink-0">
      <path fill="#f35325" d="M0 0h11v11H0z" />
      <path fill="#81bc06" d="M12 0h11v11H12z" />
      <path fill="#05a6f0" d="M0 12h11v11H0z" />
      <path fill="#ffba08" d="M12 12h11v11H12z" />
    </svg>
  );
}

export function LoginForm({ authError }: { authError?: boolean }) {
  const [isPending, setIsPending] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  async function handleMicrosoftLogin() {
    setIsPending(true);
    setClientError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          scopes: "email profile openid",
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error(err);
      setClientError("Não foi possível iniciar o login com a Microsoft. Tente novamente.");
      setIsPending(false);
    }
  }

  const errorMessage = clientError ?? (authError ? "Falha na autenticação. Tente novamente." : null);

  return (
    <div className="glass-panel login-card">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[#142033]">Bem-vindo de volta</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Use seu e-mail corporativo MC4 para entrar com segurança.
        </p>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-red-400/30 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleMicrosoftLogin}
        disabled={isPending}
        className="group mt-6 flex h-12 w-full items-center justify-center gap-3 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-5 text-[15px] font-semibold text-[#142033] shadow-sm transition hover:border-[#EB5727]/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EB5727] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <span
            aria-hidden="true"
            className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-[#EB5727]"
          />
        ) : (
          <MicrosoftLogo />
        )}
        {isPending ? "Redirecionando para a Microsoft..." : "Entrar com a Microsoft"}
      </button>

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Autenticação protegida pelo Microsoft Entra ID
      </p>
    </div>
  );
}
