/**
 * CONSULTA DE INVENTÁRIO POR LOCAL
 * Objetivo: Fornecer um espelho do inventário real filtrado por estoque físico ou veículo.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ConsultaPageProps = {
  searchParams?: Promise<{
    estoqueId?: string;
    q?: string;
  }>;
};

// BLOCO: UTILITÁRIOS DE NORMALIZAÇÃO E URL
// normalizeText: Remove acentos e padroniza o texto para buscas seguras no frontend.
// buildQueryString: Sincroniza os filtros de pesquisa com a URL, permitindo compartilhar links de consultas específicas.

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function buildQueryString(estoqueId: string, q: string) {
  const params = new URLSearchParams();

  if (estoqueId) {
    params.set("estoqueId", estoqueId);
  }

  if (q) {
    params.set("q", q);
  }

  return params.toString();
}

export default async function ConsultaPage({ searchParams }: ConsultaPageProps) {
  // BLOCO: RECUPERAÇÃO DE PARÂMETROS E CONEXÃO
  // Captura os termos de busca e o ID do estoque selecionado diretamente da URL (Server-side).
  const params = (await searchParams) ?? {};
  const searchTerm = (params.q ?? "").trim();

  const supabase = await createSupabaseServerClient();

  // RECUPERAÇÃO DO PERFIL (RBAC): Descobre se o usuário logado é cliente, operador ou admin
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();

  const userRole = profile?.role ?? "cliente";
  // Apenas operadores e administradores possuem permissão para exportar relatórios/inventários
  const canExport = userRole === "operador" || userRole === "admin";

  type EstoqueOption = {
    id: string;
    nome: string | null;
  };

  // BLOCO: BUSCA DE ESTOQUES E DEFINIÇÃO DE PADRÃO
  // Busca a lista de locais e tenta definir "Recife" como padrão através da normalização.
  const [{ data: estoques }] = await Promise.all([
    supabase.from("estoques").select("id, nome").order("nome", { ascending: true }),
  ]);

  const estoqueOptions = (estoques ?? []) as EstoqueOption[];
  const recifeEstoque = estoqueOptions.find((estoque) => normalizeText(estoque.nome) === "recife");
  const selectedEstoqueId = params.estoqueId ?? recifeEstoque?.id ?? estoqueOptions[0]?.id ?? "";

  type InventoryRow = {
    quantidade: number;
    itens: {
      nome: string | null;
      categoria: string | null;
      cliente: string | null;
      foto_url: string | null;
    } | {
      nome: string | null;
      categoria: string | null;
      cliente: string | null;
      foto_url: string | null;
    }[] | null;
  };


  // BLOCO: CONSULTA DE SALDO COM JOIN
  // Realiza o join com a tabela 'itens' para trazer metadados (categoria, cliente, foto) junto ao saldo.
  const { data: inventarioData } = selectedEstoqueId
    ? await supabase
        .from("estoque_itens")
        .select("quantidade, itens ( nome, categoria, cliente, foto_url )")
        .eq("estoque_id", selectedEstoqueId)
    : { data: [] as never[] };

  const inventoryRows = (inventarioData ?? []) as InventoryRow[];

  // BLOCO: FILTRAGEM MULTICAMPO
  // Filtra os resultados localmente com base no termo 'q', buscando no Nome, Cliente ou Categoria simultaneamente.
  const filteredRows = inventoryRows.filter((row) => {
    if (!searchTerm) return true;
    const item = Array.isArray(row.itens) ? row.itens[0] : row.itens;
    const haystack = `${item?.nome ?? ""} ${item?.cliente ?? ""} ${item?.categoria ?? ""}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  const exportQuery = buildQueryString(selectedEstoqueId, searchTerm);
  const selectedEstoqueNome = estoqueOptions.find((estoque) => estoque.id === selectedEstoqueId)?.nome ?? recifeEstoque?.nome ?? "Inventário";

  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Consulta por local</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
              Selecione um estoque e filtre por item ou cliente. Esta tela já consulta o Supabase e será o espelho do inventário real.
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--text-muted)]">
              Estoque padrão: <span className="text-[var(--foreground)]">{selectedEstoqueNome}</span>
            </p>
          </div>

          {/* Oculta os botões de exportação caso o usuário logado seja Cliente */}
          {canExport && (
            <div className="flex flex-wrap gap-2">
              <a
                href={`/consulta/export/csv${exportQuery ? `?${exportQuery}` : ""}`}
                className="rounded-2xl border border-[var(--panel-border)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel-border)]/10"
              >
                EXPORT CSV
              </a>
              <a
                href={`/consulta/export/pdf${exportQuery ? `?${exportQuery}` : ""}`}
                className="rounded-2xl border border-[var(--panel-border)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel-border)]/10"
              >
                Baixar PDF
              </a>
            </div>
          )}
        </div>

        <form method="get" className="mt-6 grid gap-4 md:grid-cols-[1.2fr_1fr_auto]">
          <select name="estoqueId" defaultValue={selectedEstoqueId} className="mc4-form-select rounded-2xl px-4 py-3 text-sm" required>
            <option value="" disabled>
              Escolha um estoque
            </option>
            {estoqueOptions.map((estoque) => (
              <option key={estoque.id} value={estoque.id} className="bg-[var(--panel)] text-[var(--foreground)]">
                {estoque.nome}
              </option>
            ))}
          </select>

          <input name="q" defaultValue={searchTerm} placeholder="Filtrar por item ou cliente" className="mc4-form-input rounded-2xl px-4 py-3 text-sm" />

          <button type="submit" className="mc4-btn-primary rounded-2xl px-5 py-3 text-sm font-semibold transition">
            Buscar
          </button>
        </form>
      </section>

      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Inventário do local</h3>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-cyan-100">
            {filteredRows.length} itens
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--panel-border)] table-surface">
          <table className="min-w-full divide-y divide-[var(--panel-border)] text-sm">
            <thead className="bg-[var(--panel-border)]/20 text-[var(--foreground)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Item</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Categoria</th>
                <th className="px-4 py-3 text-center font-medium">Quantidade</th>
                <th className="px-4 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--panel-border)] bg-[var(--panel)]">
              {selectedEstoqueId ? (
                filteredRows.length > 0 ? (
                  filteredRows.map((row) => {
                    const item = Array.isArray(row.itens) ? row.itens[0] : row.itens;
                    const statusClass = row.quantidade > 0 ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200";

                    return (
                      <tr key={`${item?.nome ?? "item"}-${row.quantidade}`}>
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">{item?.nome ?? "Item excluído"}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{item?.cliente ?? "-"}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{item?.categoria ?? "-"}</td>
                        <td className="px-4 py-3 text-center font-semibold text-[var(--foreground)]">{row.quantidade}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusClass}`}>
                            {row.quantidade > 0 ? "Em estoque" : "Zerado"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-5 text-center text-[var(--text-muted)]" colSpan={5}>
                      Nenhum item encontrado para esse filtro.
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td className="px-4 py-5 text-center text-[var(--text-muted)]" colSpan={5}>
                    Selecione um estoque acima para exibir o inventário.
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