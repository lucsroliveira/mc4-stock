"use client";

import { useMemo, useState } from "react";

type ReportMovementRow = {
  id: string;
  dataMovimentacao: string;
  tipo: string;
  quantidade: number;
  observacao: string;
  itemNome: string;
  origemNome: string;
  destinoNome: string;
  usuarioResponsavel: string;
};

type RelatoriosFiltersTableProps = {
  initialRows: ReportMovementRow[];
  initialInicio: string;
  initialFim: string;
  initialTipo: string;
  initialPesquisa: string;
  canExport: boolean;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const ITEMS_PER_PAGE = 10;

function formatDateInput(value: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

function buildExportHref(inicio: string, fim: string, tipo: string, pesquisa: string) {
  const params = new URLSearchParams();

  if (inicio) params.set("inicio", inicio);
  if (fim) params.set("fim", fim);
  if (tipo) params.set("tipo", tipo);
  if (pesquisa) params.set("q", pesquisa);

  return `/relatorios/export${params.toString() ? `?${params.toString()}` : ""}`;
}

export function RelatoriosFiltersTable({
  initialRows,
  initialInicio,
  initialFim,
  initialTipo,
  initialPesquisa,
  canExport,
}: RelatoriosFiltersTableProps) {
  const [inicio, setInicio] = useState(formatDateInput(initialInicio));
  const [fim, setFim] = useState(formatDateInput(initialFim));
  const [tipo, setTipo] = useState(initialTipo || "todos");
  const [pesquisa, setPesquisa] = useState(initialPesquisa);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRows = useMemo(() => {
    return initialRows.filter((row) => {
      const search = pesquisa.toLowerCase();
      const matchSearch =
        row.itemNome.toLowerCase().includes(search) ||
        row.usuarioResponsavel.toLowerCase().includes(search) ||
        row.observacao.toLowerCase().includes(search);

      const matchTipo = tipo === "todos" || row.tipo === tipo;

      const movementDate = new Date(row.dataMovimentacao).getTime();
      const matchInicio = !inicio || movementDate >= new Date(inicio).getTime();
      const matchFim = !fim || movementDate <= new Date(fim + "T23:59:59").getTime();

      return matchSearch && matchTipo && matchInicio && matchFim;
    });
  }, [initialRows, inicio, fim, tipo, pesquisa]);

  // PAGINAÇÃO
  const totalItems = filteredRows.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = filteredRows.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const total = filteredRows.length;
  const entradas = filteredRows.filter((row) => row.tipo === "entrada").length;
  const saidas = filteredRows.filter((row) => row.tipo === "saida").length;
  const transferencias = filteredRows.filter((row) => row.tipo === "transferencia").length;
  const exportHref = buildExportHref(inicio, fim, tipo, pesquisa);

  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">Relatórios</p>
        <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">Auditoria por período e tipo de movimentação</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
          Use os filtros para recortar o histórico e enxergar somente o intervalo que interessa para conferência ou exportação.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_0.8fr_1fr_auto]">
          <input
            type="date"
            name="inicio"
            value={inicio}
            onChange={(event) => setInicio(event.target.value)}
            className="mc4-form-input rounded-2xl px-4 py-3 text-sm"
            aria-label="Data inicial"
          />
          <input
            type="date"
            name="fim"
            value={fim}
            onChange={(event) => setFim(event.target.value)}
            className="mc4-form-input rounded-2xl px-4 py-3 text-sm"
            aria-label="Data final"
          />
          <select
            name="tipo"
            value={tipo}
            onChange={(event) => setTipo(event.target.value)}
            className="mc4-form-select rounded-2xl px-4 py-3 text-sm"
            aria-label="Tipo de movimentação"
          >
            <option value="todos" className="bg-[var(--panel)] text-[var(--foreground)]">Todos os tipos</option>
            <option value="entrada" className="bg-[var(--panel)] text-[var(--foreground)]">Entrada</option>
            <option value="saida" className="bg-[var(--panel)] text-[var(--foreground)]">Saída</option>
            <option value="transferencia" className="bg-[var(--panel)] text-[var(--foreground)]">Transferência</option>
          </select>

          <input
            type="text"
            name="q"
            value={pesquisa}
            onChange={(event) => setPesquisa(event.target.value)}
            placeholder="Pesquisar item, origem, destino ou observação"
            className="mc4-form-input rounded-2xl px-4 py-3 text-sm"
            aria-label="Pesquisar relatórios" 
          />

          <div className="flex gap-2 md:justify-end">
            <button
              type="button"
              onClick={() => {
                setInicio("");
                setFim("");
                setTipo("todos");
                setPesquisa("");
              }}
              className="rounded-2xl border border-[var(--panel-border)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel-border)]/10"
            >
              Limpar
            </button>
            {canExport ? (
              <a href={exportHref} className="rounded-2xl border border-[var(--panel-border)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel-border)]/10">
                Exportar CSV
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
            <p className="text-sm text-[var(--text-muted)]">Movimentos</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{total}</p>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(0,165,181,0.08)] p-4">
            <p className="text-sm text-[var(--text-muted)]">Entradas</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{entradas}</p>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(235,87,39,0.08)] p-4">
            <p className="text-sm text-[var(--text-muted)]">Saídas</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{saidas}</p>
          </div>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(206,219,5,0.08)] p-4">
            <p className="text-sm text-[var(--text-muted)]">Transferências</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{transferencias}</p>
          </div>
        </div>
      </section>


      {/* LISTA DE MOVIMENTACOES */}
      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6">
        <div className="space-y-3">
          {currentItems.length > 0 ? (
            currentItems.map((row) => (
              <div 
                key={row.id} 
                className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 hover:border-[#00a5b5]/30 transition-all"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--foreground)]">{row.itemNome}</p>
                    {/* Badge do Responsável (Auditoria) */}
                    <span className="rounded-full bg-[#cedb05]/10 px-2 py-0.5 text-[9px] font-bold text-[#cedb05] uppercase border border-[#cedb05]/20">
                      OP: {row.usuarioResponsavel}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {row.origemNome} → {row.destinoNome} • {new Date(row.dataMovimentacao).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="text-right">
                  <span className={`mc4-badge font-bold ${row.tipo === 'saida' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'mc4-badge-lime'}`}>
                    {row.tipo === 'saida' ? '-' : '+'}{row.quantidade.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-[var(--text-muted)] italic">Nenhum registro encontrado.</p>
          )}
        </div>

        {/* CONTROLES DE PAGINAÇÃO */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between border-t border-[var(--panel-border)] pt-6">
            <p className="text-xs text-[var(--text-muted)]">
              Mostrando {currentItems.length} de {totalItems.toLocaleString('pt-BR')} movimentações
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); window.scrollTo(0, 0); }}
                disabled={currentPage === 1}
                className="mc4-badge px-4 py-2 text-xs disabled:opacity-30 disabled:pointer-events-none"
              > Anterior </button>
              <button
                onClick={() => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); window.scrollTo(0, 0); }}
                disabled={currentPage === totalPages}
                className="mc4-badge px-4 py-2 text-xs disabled:opacity-30 disabled:pointer-events-none"
              > Próximo </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
