/**
 * GESTÃO DE MOVIMENTAÇÕES (ENTRADAS, SAÍDAS E TRANSFERÊNCIAS)
 * Objetivo: Registrar o histórico de fluxo e acionar a atualização de saldos.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MovimentacaoForm } from "@/components/movimentacao-form";
import DataTableSearch from "@/components/DataTableSearch";

export default async function MovimentacoesPage() {
  const supabase = await createSupabaseServerClient();

  // BLOCO: DATA FETCHING PARALELO
  // Busca itens e estoques para preencher o formulário, além do histórico recente para auditoria.
  const [{ data: itens }, { data: estoques }, { data: recentes }, { data: balances }] = await Promise.all([
    supabase.from("itens").select("id, nome").order("nome", { ascending: true }),
    supabase.from("estoques").select("id, nome").order("nome", { ascending: true }),
    supabase
      .from("movimentacoes")
      .select("id, data_movimentacao, tipo, quantidade, observacao, criado_por, itens ( nome ), origem:estoques!origem_id ( nome ), destino:estoques!destino_id ( nome )")
      .order("data_movimentacao", { ascending: false }),
    supabase.from("estoque_itens").select("item_id, estoque_id, quantidade, estoques ( nome )"),
  ]);

  type ItemOption = { id: string; nome: string | null };
  type EstoqueOption = { id: string; nome: string | null };
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
    estoque_nome: (Array.isArray(row.estoques) ? row.estoques[0]?.nome : row.estoques?.nome) ?? null,
  }));
  
  // BLOCO: MAPEAMENTO DE RESULTADOS (NORMALIZAÇÃO)
  // Converte os retornos complexos do Supabase (objetos/arrays) em estruturas planas para facilitar a renderização na tabela.
  const movementRows = (recentes ?? []).map((row: MovementRow) => {
    const item = Array.isArray(row.itens) ? row.itens[0] : row.itens;
    const origem = Array.isArray(row.origem) ? row.origem[0] : row.origem;
    const destino = Array.isArray(row.destino) ? row.destino[0] : row.destino;

    return {
      id: row.id,
      data: new Date(row.data_movimentacao).toLocaleString("pt-BR"),
      itemNome: item?.nome ?? "Item excluído",
      tipo: row.tipo,
      origemDestino: `${origem?.nome ?? "Externo"} → ${destino?.nome ?? "Baixa"}`,
      quantidades: row.quantidade,
    };
  });

  // BLOCO: INTERFACE DE REGISTRO
  // O componente MovimentacaoForm gerencia o envio para o banco e a lógica de validação de saldo antes de salvar.
  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Nova movimentação</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
          Registra entrada, saída ou transferência e usa a RPC do Supabase para atualizar o saldo antes de salvar o histórico.
        </p>

        <MovimentacaoForm itemRows={itemRows} estoqueRows={estoqueRows} balances={balanceRows} />
      </section>

      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Movimentações recentes</h3>
        
        <DataTableSearch
          data={movementRows}
          searchKeys={["itemNome", "tipo", "origemDestino"]}
          placeholder="Buscar por item, tipo, origem ou destino..."
          itemsPerPage={10}
          columns={[
            { header: "Data", accessorKey: "data", className: "text-[var(--text-muted)]" },
            { header: "Item", accessorKey: "itemNome", className: "font-medium text-[var(--foreground)]" },
            { header: "Tipo", accessorKey: "tipo" },
            { header: "Origem / Destino", accessorKey: "origemDestino", className: "text-[var(--text-muted)]" },
            { header: "Qtd", accessorKey: "quantidades", className: "text-right font-semibold text-[var(--foreground)]" },
          ]}
        />
      </section>
    </div>
  );
}