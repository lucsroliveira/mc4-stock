import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MovimentacaoForm } from "@/components/movimentacao-form";

export default async function MovimentacoesPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: itens }, { data: estoques }, { data: recentes }, { data: balances }] = await Promise.all([
    supabase.from("itens").select("id, nome").order("nome", { ascending: true }),
    supabase.from("estoques").select("id, nome").order("nome", { ascending: true }),
    supabase
      .from("movimentacoes")
      .select("id, data_movimentacao, tipo, quantidade, observacao, criado_por, itens ( nome ), origem:estoques!origem_id ( nome ), destino:estoques!destino_id ( nome )")
      .order("data_movimentacao", { ascending: false })
      .limit(8),
    supabase.from("estoque_itens").select("item_id, estoque_id, quantidade, estoques ( nome )"),
  ]);

  type ItemOption = {
    id: string;
    nome: string | null;
  };

  type EstoqueOption = {
    id: string;
    nome: string | null;
  };

  type BalanceRow = {
    item_id: string;
    estoque_id: string;
    quantidade: number;
    estoques: { nome: string | null } | { nome: string | null }[] | null;
  };

  type MovementRow = {
    id: string;
    data_movimentacao: string;
    tipo: string;
    quantidade: number;
    observacao: string | null;
    criado_por: string | null;
    itens: { nome: string | null } | { nome: string | null }[] | null;
    origem: { nome: string | null } | { nome: string | null }[] | null;
    destino: { nome: string | null } | { nome: string | null }[] | null;
  };

  const itemRows = (itens ?? []) as ItemOption[];
  const estoqueRows = (estoques ?? []) as EstoqueOption[];
  const balanceRows = (balances ?? []).map((row: BalanceRow) => ({
    item_id: row.item_id,
    estoque_id: row.estoque_id,
    quantidade: row.quantidade ?? 0,
    estoque_nome: Array.isArray(row.estoques) ? row.estoques[0]?.nome : row.estoques?.nome,
  }));

  const movementRows = (recentes ?? []).map((row: MovementRow) => {
    const item = Array.isArray(row.itens) ? row.itens[0] : row.itens;
    const origem = Array.isArray(row.origem) ? row.origem[0] : row.origem;
    const destino = Array.isArray(row.destino) ? row.destino[0] : row.destino;

    return {
      id: row.id,
      data: row.data_movimentacao,
      tipo: row.tipo,
      quantidade: row.quantidade,
      observacao: row.observacao,
      criado_por: row.criado_por,
      itemNome: item?.nome ?? "Item excluído",
      origemNome: origem?.nome ?? "Externo",
      destinoNome: destino?.nome ?? "Baixa",
    };
  });

  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-3xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white">Nova movimentação</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Registra entrada, saída ou transferência e usa a RPC do Supabase para atualizar o saldo antes de salvar o histórico.
        </p>

        <MovimentacaoForm itemRows={itemRows} estoqueRows={estoqueRows} balances={balanceRows} />
      </section>

      <section className="glass-panel rounded-3xl border border-white/10 p-6">
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
            <tbody className="divide-y divide-white/10 bg-slate-950/30">
              {movementRows.length > 0 ? (
                movementRows.map((movement: {
                  id: string;
                  data: string;
                  tipo: string;
                  quantidade: number;
                  itemNome: string;
                  origemNome: string;
                  destinoNome: string;
                }) => {
                  const badgeClass =
                    movement.tipo === "entrada"
                      ? "bg-emerald-400/15 text-emerald-200"
                      : movement.tipo === "saida"
                        ? "bg-rose-400/15 text-rose-200"
                        : "bg-cyan-400/15 text-cyan-200";

                  return (
                    <tr key={movement.id}>
                      <td className="px-4 py-3 text-slate-300">{new Date(movement.data).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 font-medium text-white">{movement.itemNome}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${badgeClass}`}>{movement.tipo}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {movement.origemNome} → {movement.destinoNome}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">{movement.quantidade}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-5 text-center text-slate-400" colSpan={5}>
                    Nenhuma movimentação registrada.
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