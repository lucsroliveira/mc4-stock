"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "@/lib/supabase/actions";

const initialState: AuthState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="glass-panel rounded-[2rem] border border-white/10 p-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#142033]">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="usuario@somosmc4.com.br"
            autoComplete="email"
            className="mc4-form-input w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#142033]">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="*******"
            autoComplete="current-password"
            className="mc4-form-input w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
            required
          />
        </div>

        {state.error ? (
          <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="mc4-btn-primary w-full rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Entrando..." : "Entrar / Criar conta"}
        </button>
      </div>
    </form>
  );
}