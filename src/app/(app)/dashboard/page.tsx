// Data Fetching com o Supabase puxando 
import { createSupabaseServerClient } from "@/lib/supabase/server";
import StockSearchList from "@/components/StockSearchList";
import { getSupabaseDiagnostics } from "@/lib/supabase/diagnostics";

type RecentMovement = {
  data_movimentacao: string;
  tipo: string;
  quantidade: number;
  itens: { nome: string | null } | { nome: string | null }[] | null;
  origem: { nome: string | null } | { nome: string | null }[] | null;
  destino: { nome: string | null } | { nome: string | null }[] | null;
};

type StockRelation = {
  nome: string | null;
  cliente?: string | null;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const diagnostics = await getSupabaseDiagnostics();

  const [itensCount, estoquesCount, movimentacoesCount, recentMovementsResult, saldosResult] = await Promise.all([
    supabase.from("itens").select("id", { count: "exact", head: true }),
    supabase.from("estoques").select("id", { count: "exact", head: true }),
    supabase.from("movimentacoes").select("id", { count: "exact", head: true }),
    supabase
      .from("movimentacoes")
      .select(
        `data_movimentacao, tipo, quantidade, itens ( nome ), origem:estoques!origem_id ( nome ), destino:estoques!destino_id ( nome )`,
      )
      .order("data_movimentacao", { ascending: false })
      .limit(6),
    supabase.from("estoque_itens").select("quantidade, estoque_id, estoques ( nome ), itens ( nome, cliente )"),
  ]);

  const kpis = [
    { label: "Itens no catálogo", value: String(itensCount.count ?? 0), note: "Itens cadastrados no Supabase" },
    { label: "Locais ativos", value: String(estoquesCount.count ?? 0), note: "Estoques regionais e veículos" },
    { label: "Movimentações registradas", value: String(movimentacoesCount.count ?? 0), note: "Histórico auditável da operação" },
  ];

  const recentMovements = (recentMovementsResult.data ?? []) as RecentMovement[];

  type StockSummaryRow = {
    quantidade: number;
    estoque_id: string;
    estoques: StockRelation | StockRelation[] | null;
    itens: StockRelation | StockRelation[] | null;
  };

  const stockSummary = new Map<string, { total: number; cliente: string }>();
  const locationSummary = new Map<string, number>();
  let totalUnits = 0;
  let activeItems = 0;

  (saldosResult.data ?? []).forEach((row: StockSummaryRow) => {
    const item = row.itens as StockRelation | StockRelation[] | null;
    const itemName = Array.isArray(item) ? item[0]?.nome : item?.nome;
    const itemClient = Array.isArray(item) ? item[0]?.cliente : item?.cliente;
    const estoque = row.estoques as StockRelation | StockRelation[] | null;
    const estoqueName = Array.isArray(estoque) ? estoque[0]?.nome : estoque?.nome;

    if (!itemName) return;

    const current = stockSummary.get(itemName) ?? { total: 0, cliente: itemClient ?? "Geral" };
    current.total += row.quantidade ?? 0;
    stockSummary.set(itemName, current);

    totalUnits += row.quantidade ?? 0;
    if ((row.quantidade ?? 0) > 0) {
      activeItems += 1;
    }

    if (estoqueName) {
      const locationCurrent = locationSummary.get(estoqueName) ?? 0;
      locationSummary.set(estoqueName, locationCurrent + (row.quantidade ?? 0));
    }
  });

  // Mantemos a listagem completa ordenada por maior saldo para a busca
  const stockRows = Array.from(stockSummary.entries())
    .sort((left, right) => right[1].total - left[1].total)
    .map(([nome, summary]) => ({ nome, ...summary }));

  // Apenas para o destaque dos KPIs (pegamos o primeiro elemento do array ordenado)
  const topStockRowsForHighlight = stockRows.slice(0, 6);

  const topLocations = Array.from(locationSummary.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
    
  const highlightItem = topStockRowsForHighlight[0]?.nome ?? "Nenhum saldo";
  const highlightUnits = topStockRowsForHighlight[0]?.total ?? 0;

  return (
    <div className="grid gap-6">
      {diagnostics.hasFailures && (
        <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-[var(--foreground)]">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">Diagnóstico Supabase</p>
          <p className="mt-3 text-[var(--text-muted)]">
            O app detectou configuração ausente ou bloqueio de acesso ao Supabase. Os dados exibidos dependem exclusivamente do banco e do Storage reais.
          </p>
          <ul className="mt-4 space-y-2 text-[var(--text-muted)]">
            {diagnostics.checks.map((check) => (
              <li key={check.target}>
                {check.ok ? "OK" : "Falha"} - {check.target}: {check.detail}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        {kpis.map((item) => (
          <article key={item.label} className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6 shadow-[0_16px_40px_rgba(65,107,169,0.12)]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#00a5b5]">{item.label}</p>
            <p className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)]">{item.value}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{item.note}</p>
          </article>
        ))}
      </section>

      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#00a5b5]">Visão operacional</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Saldo, locais e movimentações em tempo real</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              O painel agora consolida unidades em estoque, itens ativos e os principais locais com saldo para apoiar decisões rápidas.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(0,165,181,0.08)] px-4 py-3 text-sm">
              <p className="text-[var(--text-muted)]">Unidades</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{totalUnits}</p>
            </div>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(206,219,5,0.08)] px-4 py-3 text-sm">
              <p className="text-[var(--text-muted)]">Itens ativos</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{activeItems}</p>
            </div>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(235,87,39,0.08)] px-4 py-3 text-sm">
              <p className="text-[var(--text-muted)]">Maior saldo</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{highlightItem}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Resumo da operação</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            O dashboard agora mostra indicadores úteis para operação: volume total, itens com saldo e locais com maior concentração de estoque.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(0,165,181,0.08)] p-4">
              <p className="font-medium text-[#00a5b5]">Saldo destacado</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {highlightItem} concentra {highlightUnits} unidade(s) no inventário consolidado.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(206,219,5,0.08)] p-4">
              <p className="font-medium text-[#cedb05]">Locais prioritários</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {topLocations.length > 0 ? topLocations.map(([nome, total]) => `${nome} (${total})`).join(" • ") : "Nenhum local com saldo registrado ainda."}
              </p>
            </div>
          </div>
        </article>

        <aside className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Saldo geral por item</h3>
          {/* Renderiza o componente interativo de busca passando todos os itens calculados */}
          <StockSearchList initialRows={stockRows} />
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Movimentações recentes</h3>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--panel-border)]">
            <table className="min-w-full divide-y divide-[var(--panel-border)] text-sm">
              <thead className="bg-[var(--panel-border)]/20 text-[var(--foreground)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Item</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Origem / Destino</th>
                  <th className="px-4 py-3 text-right font-medium">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--panel-border)] bg-[var(--panel)]">
                {recentMovements.length > 0 ? (
                  recentMovements.map((movement) => {
                    const itemName = Array.isArray(movement.itens) ? movement.itens[0]?.nome : movement.itens?.nome;
                    const originName = Array.isArray(movement.origem) ? movement.origem[0]?.nome : movement.origem?.nome;
                    const destinationName = Array.isArray(movement.destino) ? movement.destino[0]?.nome : movement.destino?.nome;
                    
                    // Badges com cores adaptadas para manter bom contraste em qualquer tema
                    const badgeClass =
                      movement.tipo === "entrada"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-200"
                        : movement.tipo === "saida"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-200"
                          : "bg-cyan-500/15 text-cyan-600 dark:text-cyan-200";

                    return (
                      <tr key={`${movement.data_movimentacao}-${movement.tipo}-${movement.quantidade}`} className="hover:bg-[var(--panel-border)]/10 transition-colors">
                        <td className="px-4 py-3 text-[var(--text-muted)]">{new Date(movement.data_movimentacao).toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">{itemName ?? "Item excluído"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${badgeClass}`}>
                            {movement.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">
                          {originName ?? "Externo"} → {destinationName ?? "Baixa"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">{movement.quantidade}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-5 text-center text-[var(--text-muted)]" colSpan={5}>
                      Nenhuma movimentação encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Próximos passos</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-muted)]">
            <li>• Criar páginas de cadastro com formulário real</li>
            <li>• Conectar movimentações ao estoque de forma dinâmica</li>
            <li>• Expandir os cadastros e relatórios com regras de negócio</li>
            <li>• Adicionar filtros e exportação de relatórios</li>
          </ul>
        </aside>
      </section>
    </div>
  );
}