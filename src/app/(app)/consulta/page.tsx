/**
 * CONSULTA DE INVENTÁRIO MULTI-LOCAL E MULTI-CLIENTE (MC4)
 * Objetivo: Rastreabilidade total de itens ativos por local e proprietário.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";

type ConsultaPageProps = {
  searchParams?: Promise<{
    estoqueId?: string;
    q?: string;
    cliente?: string;
    page?: string;
  }>;
};

const ITEMS_PER_PAGE = 10;

// Utilitário para gerenciar a seleção múltipla de IDs na URL
function toggleIdInList(currentIds: string[], id: string) {
  const ids = new Set(currentIds);
  if (ids.has(id)) {
    ids.delete(id);
  } else {
    ids.add(id);
  }
  return Array.from(ids).join(",");
}

export default async function ConsultaPage({ searchParams }: ConsultaPageProps) {
  const params = (await searchParams) ?? {};
  const searchTerm = (params.q ?? "").trim();
  const selectedCliente = params.cliente ?? "";
  const currentPage = Number(params.page ?? 1);
  const supabase = await createSupabaseServerClient();

  // 1. RECUPERAÇÃO DE DADOS MESTRE (PERFIL, ESTOQUES E CLIENTES)
  const { data: { user } } = await supabase.auth.getUser();
  const [
    { data: profile },
    { data: estoques },
    { data: itensParaFiltro }
  ] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user?.id).single(),
    supabase.from("estoques").select("id, nome").order("nome", { ascending: true }),
    supabase.from("itens").select("cliente").eq("ativo", true).order("cliente", { ascending: true })
  ]);

  const userRole = profile?.role ?? "cliente";
  const canExport = userRole === "operador" || userRole === "admin";
  const estoqueOptions = estoques ?? [];
  
  // Gera lista única de clientes para o dropdown a partir de itens ativos
  const clienteOptions = Array.from(new Set((itensParaFiltro ?? []).map(i => i.cliente).filter(Boolean)));
  const selectedEstoqueIds = params.estoqueId ? params.estoqueId.split(",").filter(id => id !== "") : [];

  // 2. CONSULTA DE SALDO COM FILTROS E SEGURANÇA (!inner)
  // O uso de !inner garante que se o item foi excluído ou está inativo, ele não retorna na query [3].
  let query = supabase
    .from("estoque_itens")
    .select(`
      quantidade, 
      estoques ( nome ), 
      itens!inner ( nome, categoria, cliente, ativo )
    `)
    .eq("itens.ativo", true); // Filtro rigoroso para itens ativos

  if (selectedEstoqueIds.length > 0) {
    query = query.in("estoque_id", selectedEstoqueIds);
  }

  if (selectedCliente) {
    query = query.eq("itens.cliente", selectedCliente);
  }

  const { data: inventarioData } = await query;

  // 3. NORMALIZAÇÃO E FILTRAGEM POR TEXTO
  const allRows = (inventarioData ?? []).map((row: any) => {
    const item = Array.isArray(row.itens) ? row.itens : row.itens;
    const estoque = Array.isArray(row.estoques) ? row.estoques : row.estoques;
    
    return {
      quantidade: row.quantidade,
      itemNome: item?.nome ?? "Item Indisponível",
      categoria: item?.categoria,
      cliente: item?.cliente,
      estoqueNome: estoque?.nome ?? "Geral"
    };
  });

  const filteredRows = allRows.filter((row) => {
    if (!searchTerm) return true;
    const haystack = `${row.itemNome} ${row.cliente} ${row.categoria}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  // 4. LÓGICA DE PAGINAÇÃO
  const totalItems = filteredRows.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="grid gap-6">
      {/* SEÇÃO DE FILTROS: TEXTO, CLIENTE E BUDGET (MULTI-SELEÇÃO) */}
      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Consulta de Inventário</h3>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)] leading-6">
              Selecione locais e clientes para filtrar o saldo.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xl">
            {/* EXPORTAÇÃO CONDICIONAL (RBAC) */}
            {canExport && (
              <div className="flex gap-2 justify-end">
                <Link 
                  href={`/consulta/export/csv?estoqueId=${selectedEstoqueIds.join(",")}&cliente=${selectedCliente}&q=${searchTerm}`} 
                  className="mc4-badge px-3 py-1.5 text-[10px] uppercase font-bold"
                > Exportar CSV </Link>
                <Link 
                  href={`/consulta/export/pdf?estoqueId=${selectedEstoqueIds.join(",")}&cliente=${selectedCliente}&q=${searchTerm}`} 
                  className="mc4-badge px-3 py-1.5 text-[10px] uppercase font-bold"
                > Gerar PDF </Link>
              </div>
            )}

            <form action="/consulta" method="GET" className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_auto] gap-2">
              <input type="hidden" name="estoqueId" value={selectedEstoqueIds.join(",")} />
              
              <select name="cliente" defaultValue={selectedCliente} className="mc4-form-select rounded-2xl px-3 py-2 text-sm">
                <option value="">Todos os Clientes</option>
                {clienteOptions.map((c) => (
                  <option key={c} value={c!}>{c}</option>
                ))}
              </select>

              <input
                name="q"
                defaultValue={searchTerm}
                placeholder="Buscar produto..."
                className="mc4-form-input flex-1 rounded-2xl px-4 py-2 text-sm"
              />
              <button type="submit" className="mc4-btn-primary px-6 rounded-2xl">Filtrar</button>
            </form>
          </div>
        </div>

        {/* CHIPS DE ESTOQUE (BUDGET STYLE) */}
        <div className="mt-8 border-t border-[var(--panel-border)] pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-4">Filtrar por Locais</p>
          <div className="flex flex-wrap gap-2">
            {estoqueOptions.map((estoque) => {
              const isSelected = selectedEstoqueIds.includes(estoque.id);
              const newIds = toggleIdInList(selectedEstoqueIds, estoque.id);
              const href = `/consulta?estoqueId=${newIds}&cliente=${selectedCliente}&q=${searchTerm}`;

              return (
                <Link key={estoque.id} href={href} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${isSelected ? "border-[#00a5b5] bg-[#00a5b5]/10 text-[#00a5b5]" : "border-[var(--panel-border)] bg-[var(--panel)] text-[var(--text-muted)]"}`}>
                  {estoque.nome}
                  {isSelected && <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#00a5b5] text-white text-[8px]">✕</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* RESULTADOS COM BADGE DE LOCALIZAÇÃO E FORMATAÇÃO BR */}
      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6">
        <div className="grid gap-3">
          {paginatedRows.length > 0 ? (
            paginatedRows.map((row, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 hover:border-[#00a5b5]/30 transition-all">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--foreground)]">{row.itemNome}</p>
                    <span className="rounded-full bg-[#00a5b5]/10 px-2 py-0.5 text-[10px] font-bold text-[#00a5b5] uppercase">
                      {row.estoqueNome}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{row.cliente} • {row.categoria}</p>
                </div>
                <div className="text-right">
                  <span className="mc4-badge mc4-badge-lime text-sm font-bold">
                    {row.quantidade.toLocaleString('pt-BR')}
                  </span>
                  <p className="text-[10px] uppercase text-[var(--text-muted)] mt-1">unidades</p>
                </div>
              </div>
            ))
          ) : (
            <p className="py-12 text-center text-sm italic text-[var(--text-muted)]">Nenhum item ativo encontrado para esta seleção.</p>
          )}
        </div>

        {/* CONTROLES DE PAGINAÇÃO */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between border-t border-[var(--panel-border)] pt-6">
            <p className="text-xs text-[var(--text-muted)]">Página {currentPage} de {totalPages} ({totalItems.toLocaleString('pt-BR')} itens)</p>
            <div className="flex gap-2">
              <Link href={`/consulta?page=${currentPage - 1}&q=${searchTerm}&estoqueId=${selectedEstoqueIds.join(",")}&cliente=${selectedCliente}`} className={`mc4-badge px-4 py-2 ${currentPage === 1 ? "pointer-events-none opacity-30" : ""}`}>Anterior</Link>
              <Link href={`/consulta?page=${currentPage + 1}&q=${searchTerm}&estoqueId=${selectedEstoqueIds.join(",")}&cliente=${selectedCliente}`} className={`mc4-badge px-4 py-2 ${currentPage === totalPages ? "pointer-events-none opacity-30" : ""}`}>Próximo</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}