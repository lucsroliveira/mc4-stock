"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { inventoryNavigation } from "@/lib/navigation";
import { signOut } from "@/lib/supabase/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConfirmDialog } from "@/components/confirm-dialog";

type AppShellProps = {
  children: React.ReactNode;
  userLabel: string;
};

// Mapeamento automático de título e subtítulo por rota
const pageInfoMap: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Dashboard",
    subtitle: "O painel consolida unidades em estoque, itens ativos e os principais locais com saldo.",
  },
  "/itens": {
    title: "Cadastro de Itens",
    subtitle: "Gerencie o catálogo de produtos, categorias, clientes e descrições do inventário.",
  },
  "/movimentacoes": {
    title: "Movimentações de Estoque",
    subtitle: "Registre entradas, saídas e transferências com atualização dinâmica de saldos.",
  },
  "/estoques": {
    title: "Locais de Estoque",
    subtitle: "Gerencie os estoques regionais, depósitos e veículos ativos na operação.",
  },
  "/consulta": {
    title: "Inventário",
    subtitle: "Verfique o que se encontra em cada estoque.",
  },
  "/dashboard": {
    title: "Dashboard",
    subtitle: "O painel consolida unidades em estoque, itens ativos e os principais locais com saldo.",
  },
};

export function AppShell({ children, userLabel }: AppShellProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const pathname = usePathname();

  // Pega o título correspondente à rota atual (ou define um padrão se não encontrar)
  const currentPage = pageInfoMap[pathname] || {
    title: "Sistema de Estoque",
    subtitle: "Controle operacional, saldo e auditoria para a operação MC4.",
  };

  const navigationIcons: Record<string, ReactNode> = {
    dashboard: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 19.5v-9Z" />
      </svg>
    ),
    itens: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path strokeLinecap="round" d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
    estoques: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" />
        <path strokeLinecap="round" d="M12 4v16" />
      </svg>
    ),
    consulta: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="11" cy="11" r="5" />
        <path strokeLinecap="round" d="m16 16 3 3" />
      </svg>
    ),
    movimentacao: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 7v10M17 17H7" />
      </svg>
    ),
    relatorios: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8l4 4v12H6z" />
        <path strokeLinecap="round" d="M14 4v4h4" />
      </svg>
    ),
  };

  return (
    <div className="min-h-screen soft-grid text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col lg:flex-row">
        <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 border-r border-[var(--sidebar-border)] p-6 lg:flex lg:flex-col" style={{ background: "var(--sidebar-bg)", color: "var(--sidebar-text)" }}>
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
                <Image src="/MC4 STOCK_ICONE.svg" alt="Logo MC4" width={28} height={28} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-[#cedb05]">MC4</p>
                <h1 className="text-2xl font-semibold tracking-tight text-white">Estoque</h1>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--sidebar-muted)]">Controle operacional, saldo e auditoria para a operação MC4.</p>
          </div>

          <div className="mb-6 rounded-3xl border border-white/15 bg-white/10 p-4 text-sm text-slate-100">
            <p className="text-xs uppercase tracking-[0.3em] text-[#cedb05]">Sessão</p>
            <p className="mt-2 font-medium text-white">{userLabel}</p>
            <p className="mt-2 text-xs text-[var(--sidebar-muted)]">Conectado ao Supabase</p>
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {inventoryNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm text-[var(--sidebar-text)] transition hover:border-white/15 hover:bg-[var(--sidebar-link-hover)]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                  {navigationIcons[item.icon]}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full rounded-2xl border border-[#cedb05]/40 bg-[#cedb05]/20 px-4 py-3 text-sm font-medium text-white transition hover:bg-[#cedb05]/30"
            >
              Sair
            </button>
          </div>
        </aside>

        <main className="flex min-h-screen flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <header className="glass-panel mb-6 rounded-3xl border border-white/10 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#00a5b5]">Sistema de estoque</p>
            <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">{currentPage.title}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{currentPage.subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-[#00a5b5]/20 bg-[#00a5b5]/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-[#0a4d56]">
                  MC4 • Supabase
                </div>
                <ThemeToggle />
              </div>
            </div>
          </header>

          {children}
        </main>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sair da sessão"
        description="Deseja realmente encerrar o acesso ao painel de estoque?"
        confirmLabel="Sim, sair"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          void signOut();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}