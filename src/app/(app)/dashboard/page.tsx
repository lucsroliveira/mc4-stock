/**
 * IMPORTAÇÕES E TIPAGEM
 * 1. createSupabaseServerClient: Inicializa a conexão segura no lado do servidor.
 * 2. getSupabaseDiagnostics: Função utilitária para checar a saúde da conexão e do bucket.
 * 3. RecentMovement/StockRelation: Tipos que lidam com a flexibilidade do Supabase,
 * já que relacionamentos (joins) podem retornar objetos únicos ou arrays.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import StockSearchList from "@/components/StockSearchList";
import { getSupabaseDiagnostics } from "@/lib/supabase/diagnostics";
import { resolveSupabaseAssetUrl } from "@/lib/supabase/storage";

type RecentMovement = {
  data_movimentacao: string;
  tipo: string;
  quantidade: number;
  itens: { nome: string | null } | { nome: string | null }[] | null;
  origem: { nome: string | null } | { nome: string | null }[] | null;
  destino: { nome: string | null } | { nome: string | null }[] | null;
};

type StockRelation = {
  id?: string | null;
  nome: string | null;
  cliente?: string | null;
  foto_url?: string | null;
  ativo?: boolean | null;
};

type StockSummaryRow = {
  quantidade: number;
  estoque_id: string;
  item_id: string;
  estoques: StockRelation | StockRelation[] | null;
  itens: StockRelation | StockRelation[] | null;
};

/**
 * Dashboard Central de Estoque
 * 
 * * Responsável por orquestrar a visualização de KPIs, histórico de movimentações
 * e saldo consolidado. Utiliza Server Components para buscar dados em paralelo
 * do Supabase, garantindo performance e SEO.
 */
export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  // Verifica se as variáveis de ambiente (.env.local) e políticas RLS estão OK
  const diagnostics = await getSupabaseDiagnostics();

  // Define a data de 30 dias atrás para os gráficos
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  // Disparamos as consultas em paralelo para reduzir o tempo de carregamento da página.
  const [itensCount, estoquesCount, movimentacoesCount, recentMovementsResult, saldosResult, historyResult] = await Promise.all([
     // Contagem exata para KPIs sem trazer o corpo dos dados usando (head: true) (otimização de tráfego) 
    supabase.from("itens").select("id", { count: "exact", head: true }).eq("ativo", true),
    supabase.from("estoques").select("id", { count: "exact", head: true }),
    supabase.from("movimentacoes").select("id", { count: "exact", head: true }),
    supabase
      .from("movimentacoes")
      .select(`data_movimentacao, tipo, quantidade, itens ( nome ), origem:estoques!origem_id ( nome ), destino:estoques!destino_id ( nome )`)
      .order("data_movimentacao", { ascending: false })
      .limit(6),
    supabase.from("estoque_itens").select("quantidade, estoque_id, item_id, estoques ( nome ), itens ( id, nome, cliente, foto_url, ativo )"),
    supabase
      .from("movimentacoes")
      .select("data_movimentacao, tipo, quantidade")
      .gte("data_movimentacao", trintaDiasAtras.toISOString())
      .order("data_movimentacao", { ascending: true }),
  ]);

  const kpis = [
    { 
      label: "Itens no catálogo", 
      value: (itensCount.count ?? 0).toLocaleString('pt-BR'), 
      note: "Itens cadastrados no Supabase" 
    },
    { 
      label: "Locais ativos", 
      value: (estoquesCount.count ?? 0).toLocaleString('pt-BR'), 
      note: "Estoques regionais e veículos" 
    },
    { 
      label: "Movimentações registradas", 
      value: (movimentacoesCount.count ?? 0).toLocaleString('pt-BR'), 
      note: "Histórico auditável da operação" 
    },
  ];

  const recentMovements = (recentMovementsResult.data ?? []) as RecentMovement[];

  const stockSummary = new Map<string, { id: string; nome: string; total: number; cliente: string; fotoUrl: string | null }>();
  const locationSummary = new Map<string, number>();
  let totalUnits = 0;
  let activeItems = 0;

  (saldosResult.data ?? []).forEach((row: StockSummaryRow) => {
    const item = row.itens as StockRelation | StockRelation[] | null;
    const itemName = Array.isArray(item) ? item[0]?.nome : item?.nome;
    const itemClient = Array.isArray(item) ? item[0]?.cliente : item?.cliente;
    const itemPhoto = Array.isArray(item) ? item[0]?.foto_url : item?.foto_url;
    const itemActive = Array.isArray(item) ? item[0]?.ativo : item?.ativo;
    const estoque = row.estoques as StockRelation | StockRelation[] | null;
    const estoqueName = Array.isArray(estoque) ? estoque[0]?.nome : estoque?.nome;

    if (!itemName || !row.item_id || itemActive === false) return;

    const current = stockSummary.get(row.item_id) ?? { 
      id: row.item_id, 
      nome: itemName, 
      total: 0, 
      cliente: itemClient ?? "Geral",
      fotoUrl: itemPhoto ?? null,
    };
    
    current.total += row.quantidade ?? 0;
    stockSummary.set(row.item_id, current);

    totalUnits += row.quantidade ?? 0;
    if ((row.quantidade ?? 0) > 0) {
      activeItems += 1;
    }

    if (estoqueName) {
      const locationCurrent = locationSummary.get(estoqueName) ?? 0;
      locationSummary.set(estoqueName, locationCurrent + (row.quantidade ?? 0));
    }
  });

  const formattedTotalUnits = totalUnits.toLocaleString('pt-BR');
  const formattedActiveItems = activeItems.toLocaleString('pt-BR');

  const stockRows = await Promise.all(
    Array.from(stockSummary.values())
      .sort((left, right) => right.total - left.total)
      .map(async (row) => ({
        ...row,
        fotoPreviewUrl: await resolveSupabaseAssetUrl(supabase, row.fotoUrl),
      })),
  );

  const topStockRowsForHighlight = stockRows.slice(0, 6);
  const topLocations = Array.from(locationSummary.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
    
  const highlightItem = topStockRowsForHighlight[0]?.nome ?? "Nenhum saldo";
  const highlightUnits = topStockRowsForHighlight[0]?.total ?? 0;

  // Cria um mapa com os últimos 30 dias zerados
  const chartDataMap = new Map();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    chartDataMap.set(label, { name: label, entrada: 0, saida: 0, transferencia: 0 });
  }

  // Preenche o mapa com os dados reais do banco
  (historyResult.data ?? []).forEach((mov) => {
    const label = new Date(mov.data_movimentacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (chartDataMap.has(label)) {
      const dayData = chartDataMap.get(label);
      // @ts-ignore
      if (dayData && mov.tipo in dayData) {
        dayData[mov.tipo] += mov.quantidade;
      }
    }
  });

  const chartData = Array.from(chartDataMap.values()) as { name: string; entrada: number; saida: number; transferencia: number }[];

  // Cálculo para normalização das linhas do SVG
  const maxVal = Math.max(...chartData.map(d => Math.max(d.entrada, d.saida, d.transferencia)), 5);
  const svgHeight = 180;
  const svgWidth = 600;
  const pointsStep = svgWidth / Math.max(chartData.length - 1, 1);

  const getPointsString = (key: 'entrada' | 'saida' | 'transferencia') => {
    return chartData.map((d, index) => {
      const x = index * pointsStep;
      const y = svgHeight - (d[key] / maxVal) * (svgHeight - 20) - 10;
      return `${x},${y}`;
    }).join(" ");
  };

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
      <section className="grid gap-2 lg:grid-cols-3">
        {kpis.map((item) => (
          <article key={item.label} className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6 shadow-[0_16px_40px_rgba(65,107,169,0.12)]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#EB5727]">{item.label}</p>
            
            
            <p className="mt-4 text-5xl font-bold tracking-tight text-[var(--foreground)]">
              {item.value}
            </p>
            
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{item.note}</p>
          </article>
        ))}
      </section>

      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
        {/* CORREÇÃO: Alinhamento vertical flex-col para empilhar o bloco de texto no topo e os cards abaixo */}
        <div className="flex flex-col gap-6">
          
          {/* Bloco de Texto (Topo) */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#EB5727]">Visão operacional</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Saldo, locais e movimentações em tempo real</h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--text-muted)]">
              O painel agora consolida unidades em estoque, itens ativos e os principais locais com saldo para apoiar decisões rápidas.
            </p>
          </div>

          {/* CORREÇÃO: Grid full width horizontal (sm:grid-cols-3) posicionado abaixo do texto */}
          <div className="grid gap-4 sm:grid-cols-3 w-full">
            {/* Unidades Totais */}
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(0,165,181,0.08)] p-5 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Unidades</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-[var(--foreground)]">
                {formattedTotalUnits}
              </p>
            </div>

            {/* Itens Ativos */}
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(206,219,5,0.08)] p-5 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Itens ativos</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-[var(--foreground)]">
                {formattedActiveItems}
              </p>
            </div>

            {/* Maior Saldo */}
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(235,87,39,0.08)] p-5 text-sm min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Maior saldo</p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-[var(--foreground)] truncate" title={highlightItem}>
                {highlightItem} <span className="text-xs font-normal text-[var(--text-muted)]">({highlightUnits.toLocaleString('pt-BR')} un.)</span>
              </p>
            </div>
          </div>

        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Resumo da operação</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Fluxo de movimentações dos últimos 30 dias</p>
            </div>
            {/* Legenda do Gráfico */}
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#00a5b5]"></span> Entradas</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#eb5727]"></span> Saídas</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#cedb05]"></span> Transf.</span>
            </div>
          </div>

          {/* GRÁFICO DE LINHAS SVG NATIVO */}
          <div className="mt-6 w-full overflow-x-auto">
            <div className="h-[220px] w-full min-w-[500px] rounded-2xl border border-[var(--panel-border)] bg-[rgba(255,255,255,0.02)] p-4 flex flex-col justify-between">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-full w-full overflow-visible">
                {/* Linhas de grade horizontais de referência */}
                <line x1="0" y1="20" x2={svgWidth} y2="20" stroke="currentColor" strokeOpacity="0.06" />
                <line x1="0" y1={svgHeight / 2} x2={svgWidth} y2={svgHeight / 2} stroke="currentColor" strokeOpacity="0.06" />
                <line x1="0" y1={svgHeight - 10} x2={svgWidth} y2={svgHeight - 10} stroke="currentColor" strokeOpacity="0.06" />

                {/* Linha de Entrada (#00a5b5) */}
                <polyline
                  fill="none"
                  stroke="#00a5b5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={getPointsString('entrada')}
                />
                {/* Linha de Saída (#eb5727) */}
                <polyline
                  fill="none"
                  stroke="#eb5727"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={getPointsString('saida')}
                />
                {/* Linha de Transferência (#cedb05) */}
                <polyline
                  fill="none"
                  stroke="#cedb05"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={getPointsString('transferencia')}
                />
              </svg>
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--panel-border)]/40">
                <span>{chartData[0]?.name ?? "Início"}</span>
                <span>{chartData[Math.floor(chartData.length / 2)]?.name ?? ""}</span>
                <span>{chartData[chartData.length - 1]?.name ?? "Hoje"}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(0,165,181,0.08)] p-4">
              <p className="font-medium text-[#EB5727]">Saldo destacado</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {highlightItem} concentra {highlightUnits.toLocaleString('pt-BR')} unidade(s) no inventário consolidado.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(206,219,5,0.08)] p-4">
              <p className="font-medium text-[#cedb05]">Locais prioritários</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {topLocations.length > 0 ? topLocations.map(([nome, total]) => `${nome} (${total.toLocaleString('pt-BR')})`).join(" • ") : "Nenhum local com saldo registrado ainda."}
              </p>
            </div>
          </div>
        </article>

        <aside className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Saldo geral por item</h3>
          <StockSearchList initialRows={stockRows} />
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6 min-w-0">
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
                    
                    const badgeClass =
                      movement.tipo === "entrada"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-200"
                        : movement.tipo === "saida"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-200"
                          : "bg-orange-500/15 text-orange-600 dark:text-orange-200";

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

        <aside className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Área reservada</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-muted)]">
            <p>Criar um histórico de comentários para controlar alterações e observações sobre os itens em estoque. Essa área ainda vai se desnvolvida hehehe.</p>
          </ul>
        </aside>
      </section>
    </div>
  );
}