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

  const filteredRows = useMemo(() => {
    return initialRows.filter((row) => {
      const movementDate = new Date(row.dataMovimentacao).getTime();

      if (inicio) {
        const startDate = new Date(`${inicio}T00:00:00.000Z`).getTime();
        if (movementDate < startDate) return false;
      }

      if (fim) {
        const endDate = new Date(`${fim}T23:59:59.999Z`).getTime();
        if (movementDate > endDate) return false;
      }

      if (tipo && tipo !== "todos" && row.tipo !== tipo) {
        return false;
      }

      if (!pesquisa.trim()) {
        return true;
      }

      const search = normalizeText(pesquisa);
      return [
        new Date(row.dataMovimentacao).toLocaleString("pt-BR"),
        row.itemNome,
        row.tipo,
        row.origemNome,
        row.destinoNome,
        row.observacao,
        row.quantidade,
      ]
        .map((value) => normalizeText(String(value)))
        .some((value) => value.includes(search));
    });
  }, [initialRows, inicio, fim, tipo, pesquisa]);

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

      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Movimentações filtradas</h3>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--panel-border)]">
          <table className="min-w-full divide-y divide-[var(--panel-border)] text-sm">
            <thead className="bg-[var(--panel-border)]/20 text-[var(--foreground)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">Item</th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">Origem</th>
                <th className="px-4 py-3 text-left font-medium">Destino</th>
                <th className="px-4 py-3 text-right font-medium">Qtd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--panel-border)] bg-[var(--panel)]">
              {filteredRows.length > 0 ? (
                filteredRows.map((movement) => {
                  const badgeClass =
                    movement.tipo === "entrada"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-200"
                      : movement.tipo === "saida"
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-200"
                        : "bg-cyan-500/15 text-cyan-600 dark:text-cyan-200";

                  return (
                    <tr key={movement.id}>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{new Date(movement.dataMovimentacao).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        <div>
                          <div>{movement.itemNome}</div>
                          {movement.observacao !== "-" ? <div className="mt-1 text-xs text-[var(--text-muted)]">{movement.observacao}</div> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${badgeClass}`}>
                          {movement.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{movement.origemNome}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{movement.destinoNome}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">{movement.quantidade}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-5 text-center text-[var(--text-muted)]" colSpan={6}>
                    Nenhuma movimentação encontrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
