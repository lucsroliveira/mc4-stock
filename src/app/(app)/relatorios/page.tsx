import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RelatoriosFiltersTable } from "@/components/relatorios-filters-table";

export const dynamic = "force-dynamic";

type SearchParams = {
  inicio?: string | string[];
  fim?: string | string[];
  tipo?: string | string[];
  q?: string | string[];
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

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

type RelatoriosPageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function RelatoriosPage({ searchParams }: RelatoriosPageProps) {
  const supabase = await createSupabaseServerClient();
  const params = (await searchParams) ?? {};
  const inicio = getParamValue(params.inicio);
  const fim = getParamValue(params.fim);
  const tipo = getParamValue(params.tipo);
  const pesquisa = getParamValue(params.q);

  const { data: movimentos } = await supabase
    .from("movimentacoes")
    .select("id, data_movimentacao, tipo, quantidade, observacao, criado_por, itens ( nome ), origem:estoques!origem_id ( nome ), destino:estoques!destino_id ( nome )")
    .order("data_movimentacao", { ascending: false });

  const movementRows = (movimentos ?? []).map((row: MovementRow) => {
    const item = Array.isArray(row.itens) ? row.itens[0] : row.itens;
    const origem = Array.isArray(row.origem) ? row.origem[0] : row.origem;
    const destino = Array.isArray(row.destino) ? row.destino[0] : row.destino;

    return {
      id: row.id,
      dataMovimentacao: row.data_movimentacao,
      tipo: row.tipo,
      itemNome: item?.nome ?? "Item excluído",
      origemNome: origem?.nome ?? "Externo",
      destinoNome: destino?.nome ?? "Baixa",
      quantidade: row.quantidade,
      observacao: row.observacao ?? "-",
    };
  });

  return <RelatoriosFiltersTable initialRows={movementRows} initialInicio={inicio} initialFim={fim} initialTipo={tipo} initialPesquisa={pesquisa} />;
}