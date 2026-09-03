"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { inventoryNavigation } from "@/lib/navigation";
import { signOut } from "@/lib/supabase/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageLoading } from "@/components/page-loading";

export type UserRole = "cliente" | "operador" | "admin";

type AppShellProps = {
  children: React.ReactNode;
  userLabel: string;
  userRole: UserRole;
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
    subtitle: "Verifique o que se encontra em cada estoque.",
  },
  "/dashboard": {
    title: "Dashboard",
    subtitle: "O painel consolida unidades em estoque, itens ativos e os principais locais com saldo.",
  },
  "/relatorios": {
    title: "Relatórios de Movimentação",
    subtitle: "Auditoria temporal de entradas, saídas e transferências operacionais.",
  },
  "/admin": {
    title: "Administração",
    subtitle: "Gerencie categorias e clientes disponíveis no cadastro de itens.",
  },
};

export function AppShell({ children, userLabel, userRole }: AppShellProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false); // Estado para gerenciar o spinner de carregamento
  const pathname = usePathname();

  const currentPage = pageInfoMap[pathname] || {
    title: "Sistema de Estoque",
    subtitle: "Controle operacional, saldo e auditoria para a operação MC4.",
  };

  // 1. DESATIVA O SPINNER ASSIM QUE A NOVA ROTA É MONTADA NO DOM
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

    // 2. INTERCEPTADOR GLOBAL DE CLIQUES EM LINKS COM TRATAMENTO DE DOWNLOADS E QUERY PARAMS
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (anchor) {
        const href = anchor.getAttribute("href");
        
        // Verifica se é uma rota interna, não é uma âncora de scroll e não é um link de exportação
        if (href && href.startsWith("/") && !href.startsWith("#") && !href.includes("/export")) {
          // CORREÇÃO: Pegamos estritamente a primeira parte da string (antes do "?")
          // O [0] é essencial: sem ele, split() retorna um array e a comparação com pathname
          // (string) é sempre verdadeira, deixando o spinner travado em mudanças de query param.
          const targetPath = href.split("?")[0];
          
          // Só exibe o spinner se o usuário estiver de fato mudando de tela (ex: /consulta -> /itens)
          if (targetPath !== pathname && anchor.target !== "_blank") {
            setIsNavigating(true);
          }
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, [pathname]);

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
    admin: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4 6.5v5c0 4.7 3.2 8.6 8 9.5 4.8-.9 8-4.8 8-9.5v-5L12 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 1.8 1.8L14.5 10" />
      </svg>
    ),
  };

  const filteredNavigation = inventoryNavigation.filter((item) => {
    if (userRole === "cliente") {
      return ["dashboard", "consulta", "relatorios"].includes(item.icon);
    }
    if (item.icon === "admin") {
      return userRole === "admin";
    }
    return true;
  });

  const roleBadgeLabels: Record<UserRole, string> = {
    cliente: "Cliente",
    operador: "Operador",
    admin: "Administrador",
  };

  return (
    <div className="min-h-screen soft-grid text-slate-100">
      {/* EXIBIÇÃO DO SPINNER GLOBAL */}
      {isNavigating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <PageLoading label="Aguarde..." />
        </div>
      )}

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col lg:flex-row">
        <aside className="sticky top-0 hidden h-screen max-h-screen w-[280px] shrink-0 border-r border-[var(--sidebar-border)] p-4 lg:flex lg:flex-col lg:p-6" style={{ background: "var(--sidebar-bg)", color: "var(--sidebar-text)" }}>
          <div className="mb-6 shrink-0 lg:mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
                <Image src="/MC4 STOCK_ICONE.png" alt="Logo MC4" width={28} height={28} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-[#cedb05]">MC4</p>
                <h1 className="text-2xl font-semibold tracking-tight text-white">Estoque</h1>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--sidebar-muted)]">Controle operacional, saldo e auditoria para a operação MC4.</p>
          </div>

          <div className="mb-4 shrink-0 rounded-3xl border border-white/15 bg-white/10 p-3 text-sm text-slate-100 lg:mb-5 lg:p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-[#cedb05]">Sessão</p>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                {roleBadgeLabels[userRole]}
              </span>
            </div>
            <p className="mt-2 font-medium text-white truncate" title={userLabel}>{userLabel}</p>
            <p className="mt-1 text-xs text-[var(--sidebar-muted)]">Conectado ao Supabase</p>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col gap-1.5">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-0 flex-1 items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition lg:px-4 lg:py-2.5 ${
                    isActive
                      ? "border-white/30 bg-white/15 font-medium text-white"
                      : "border-transparent text-[var(--sidebar-text)] hover:border-white/15 hover:bg-[var(--sidebar-link-hover)]"
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/10 lg:h-8 lg:w-8">
                    {navigationIcons[item.icon]}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 shrink-0 lg:mt-6">
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
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-[#EB5727]">Sistema de estoque</p>
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800/40 text-slate-300 border border-white/10 lg:hidden">
                Perfil: {roleBadgeLabels[userRole]}
              </span>
            </div>
            <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">{currentPage.title}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{currentPage.subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-[#EB5727]/20 bg-[#EB5727]/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-[#8f2d16]">
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