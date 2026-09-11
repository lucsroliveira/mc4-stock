/**
 * CONSULTA DE INVENTÁRIO MULTI-LOCAL, MULTI-CLIENTE E MULTI-CATEGORIA (MC4)
 * Route: src/app/(app)/consulta/page.tsx
 * Formulário padronizado com a UI/UX do formulário de Movimentações.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ImageLightbox } from "@/components/image-lightbox";
import { resolveSupabaseAssetUrl } from "@/lib/supabase/storage";
import Link from "next/link";

type ConsultaPageProps = {
  searchParams?: Promise<{
    estoqueId?: string;
    q?: string;
    cliente?: string;
    categoria?: string;
    page?: string;
  }>;
};

const ITEMS_PER_PAGE = 10;

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
  const selectedCategoria = params.categoria ?? "";
  const currentPage = Number(params.page ?? 1);
  const supabase = await createSupabaseServerClient();

  // 1. DADOS MESTRE E PERMISSÕES (RBAC)
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: estoques }, { data: itensParaFiltro }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user?.id).single(),
    supabase.from("estoques").select("id, nome").order("nome", { ascending: true }),
    supabase.from("itens").select("cliente, categoria").eq("ativo", true).order("cliente", { ascending: true }),
  ]);

  const userRole = profile?.role ?? "cliente";
  const canExport = userRole === "operador" || userRole === "admin";
  const estoqueOptions = estoques ?? [];

  // Lista única de clientes e categorias
  const clienteOptions = Array.from(new Set((itensParaFiltro ?? []).map((i) => i.cliente).filter(Boolean)));
  const categoriaOptions = Array.from(new Set((itensParaFiltro ?? []).map((i) => i.categoria).filter(Boolean)));

  const selectedEstoqueIds = params.estoqueId ? params.estoqueId.split(",").filter((id) => id !== "") : [];

  // 2. QUERY DO BANCO DE DADOS
  let query = supabase
    .from("estoque_itens")
    .select("quantidade, estoques ( nome ), itens!inner ( nome, categoria, cliente, foto_url, ativo )")
    .eq("itens.ativo", true);

  if (selectedEstoqueIds.length > 0) {
    query = query.in("estoque_id", selectedEstoqueIds);
  }

  if (selectedCliente) {
    query = query.eq("itens.cliente", selectedCliente);
  }

  if (selectedCategoria) {
    query = query.eq("itens.categoria", selectedCategoria);
  }

  const { data: inventarioData } = await query;

  // 3. NORMALIZAÇÃO E FILTRAGEM
  const allRows = await Promise.all(
    (inventarioData ?? []).map(async (row) => {
      const item = Array.isArray(row.itens) ? row.itens[0] : row.itens;
      const estoque = Array.isArray(row.estoques) ? row.estoques[0] : row.estoques;

      return {
        quantidade: row.quantidade,
        itemNome: item?.nome ?? "Item Indisponível",
        categoria: item?.categoria,
        cliente: item?.cliente,
        estoqueNome: estoque?.nome ?? "Geral",
        fotoPreviewUrl: await resolveSupabaseAssetUrl(supabase, item?.foto_url),
      };
    })
  );

  const filteredRows = allRows.filter((row) => {
    if (!searchTerm) return true;
    const haystack = `${row.itemNome} ${row.cliente} ${row.categoria}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  // 4. PAGINAÇÃO
  const totalItems = filteredRows.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const exportQueryParams = `estoqueId=${selectedEstoqueIds.join(",")}&cliente=${selectedCliente}&categoria=${selectedCategoria}&q=${searchTerm}`;

  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6">
        <div className="flex flex-col gap-4 border-b border-[var(--panel-border)]/40 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Consulta de inventário</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
              Selecione locais, clientes e categorias para filtrar o saldo e consultar os itens disponíveis.
            </p>
          </div>

          {canExport && (
            <div className="flex flex-wrap gap-3 sm:shrink-0 sm:justify-end items-center">
              <Link
                href={`/consulta/export/csv?${exportQueryParams}`}
                className="rounded-2xl border border-[var(--panel-border)] px-3 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[#EB5727]/40 hover:bg-[#EB5727]/10"
              >
                Gerar CSV
              </Link>
              <Link
                href={`/consulta/export/pdf?${exportQueryParams}`}
                className="mc4-btn-primary rounded-2xl px-3 py-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60"
              >
                Gerar PDF
              </Link>
            </div>
          )}
        </div>

        {/* CHIPS DE ESTOQUE */}
        <div className="mt-5 pt-7">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Locais do estoque</p>
              <p className="mt-1 mb-2 text-sm text-[var(--text-muted)]">Selecione um ou mais locais para restringir o saldo exibido.</p>
            </div>
            {selectedEstoqueIds.length > 0 && (
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#EB5727]">
                {selectedEstoqueIds.length} selecionado{selectedEstoqueIds.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {estoqueOptions.map((estoque) => {
              const isSelected = selectedEstoqueIds.includes(estoque.id);
              const newIds = toggleIdInList(selectedEstoqueIds, estoque.id);
              const href = `/consulta?estoqueId=${newIds}&cliente=${selectedCliente}&categoria=${selectedCategoria}&q=${searchTerm}`;

              return (
                <Link
                  key={estoque.id}
                  href={href}
                  className={`flex min-h-10 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all ${
                    isSelected
                      ? "border-[#EB5727] bg-[#EB5727]/10 text-[#EB5727]"
                      : "border-[var(--panel-border)] bg-[var(--panel)] text-[var(--text-muted)] hover:border-[#EB5727]/40 shadow-sm"
                  }`}
                >
                  {estoque.nome}
                  {isSelected && <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#EB5727] text-white text-[8px]">✕</span>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* FORMULÁRIO DE FILTROS (MANTIDO NA POSIÇÃO ORIGINAL, COM O DESIGN PADRÃO DE MOVIMENTAÇÕES) */}
        <form action="/consulta" method="GET" className="mt-6 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="estoqueId" value={selectedEstoqueIds.join(",")} />

          {/* Seletor de Cliente */}
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--text-muted)]">Cliente / Proprietário</span>
            <select
              name="cliente"
              defaultValue={selectedCliente}
              className={`mc4-form-select rounded-2xl px-4 py-3 text-sm transition-all focus:border-[#EB5727] ${
                selectedCliente ? "!border-[#EB5727]/60 !bg-[#EB5727]/[0.02] font-semibold" : ""
              }`}
            >
              <option value="">Todos os Clientes</option>
              {clienteOptions.map((c) => (
                <option key={c} value={c!}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {/* Seletor de Categoria */}
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--text-muted)]">Categoria</span>
            <select
              name="categoria"
              defaultValue={selectedCategoria}
              className={`mc4-form-select rounded-2xl px-4 py-3 text-sm transition-all focus:border-[#EB5727] ${
                selectedCategoria ? "!border-[#EB5727]/60 !bg-[#EB5727]/[0.02] font-semibold" : ""
              }`}
            >
              <option value="">Todas as Categorias</option>
              {categoriaOptions.map((cat) => (
                <option key={cat} value={cat!}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          {/* Campo de Busca Rápida */}
          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-medium text-[var(--text-muted)]">Busca rápida</span>
            <input
              name="q"
              defaultValue={searchTerm}
              placeholder="Buscar produto por nome..."
              className={`mc4-form-input rounded-2xl px-4 py-3 text-sm transition-all focus:border-[#EB5727] ${
                searchTerm ? "!border-[#EB5727]/60 !bg-[#EB5727]/[0.02] font-semibold" : ""
              }`}
            />
          </label>

          {/* Botão de Filtrar */}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="mc4-btn-primary rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60"
            >
              Filtrar consulta
            </button>
          </div>
        </form>
      </section>

      {/* RESULTADOS */}
      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6">
        <div className="grid gap-3">
          {paginatedRows.length > 0 ? (
            paginatedRows.map((row, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ImageLightbox
                    src={row.fotoPreviewUrl}
                    alt={row.itemNome}
                    title={row.itemNome}
                    client={row.cliente}
                    category={row.categoria}
                  />
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-[var(--foreground)]">{row.itemNome}</p>
                      <span className="rounded-full bg-[#EB5727]/10 px-2 py-0.5 text-[10px] font-bold text-[#EB5727] uppercase">
                        {row.estoqueNome}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{row.cliente} • {row.categoria}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="mc4-badge mc4-badge-lime text-sm font-bold">
                    {row.quantidade.toLocaleString("pt-BR")}
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
          <div className="mt-8 flex flex-col gap-3 border-t border-[var(--panel-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--text-muted)]">
              Mostrando {paginatedRows.length} de {totalItems.toLocaleString("pt-BR")} itens • página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Link
                href={`/consulta?${exportQueryParams}&page=${Math.max(currentPage - 1, 1)}`}
                aria-disabled={currentPage === 1}
                className={`mc4-badge px-4 py-2 text-xs ${currentPage === 1 ? "pointer-events-none opacity-30" : ""}`}
              >
                Anterior
              </Link>
              <Link
                href={`/consulta?${exportQueryParams}&page=${Math.min(currentPage + 1, totalPages)}`}
                aria-disabled={currentPage === totalPages}
                className={`mc4-badge px-4 py-2 text-xs ${currentPage === totalPages ? "pointer-events-none opacity-30" : ""}`}
              >
                Próximo
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}