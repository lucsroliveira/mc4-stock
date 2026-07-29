import { createSupabaseServerClient } from "@/lib/supabase/server";

type ConsultaPageProps = {
  searchParams?: Promise<{
    estoqueId?: string;
    q?: string;
  }>;
};

export default async function ConsultaPage({ searchParams }: ConsultaPageProps) {
  const params = (await searchParams) ?? {};
  const selectedEstoqueId = params.estoqueId ?? "";
  const searchTerm = (params.q ?? "").trim();

  const supabase = await createSupabaseServerClient();
  type EstoqueOption = {
    id: string;
    nome: string | null;
  };

  const [{ data: estoques }, inventarioResult] = await Promise.all([
    supabase.from("estoques").select("id, nome").order("nome", { ascending: true }),
    selectedEstoqueId
      ? supabase
          .from("estoque_itens")
          .select("quantidade, itens ( nome, categoria, cliente, foto_url )")
          .eq("estoque_id", selectedEstoqueId)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const estoqueOptions = (estoques ?? []) as EstoqueOption[];

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

  const inventoryRows = (inventarioResult.data ?? []) as InventoryRow[];
  const filteredRows = inventoryRows.filter((row) => {
    if (!searchTerm) return true;
    const item = Array.isArray(row.itens) ? row.itens[0] : row.itens;
    const haystack = `${item?.nome ?? ""} ${item?.cliente ?? ""} ${item?.categoria ?? ""}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-3xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white">Consulta por local</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Selecione um estoque e filtre por item ou cliente. Esta tela já consulta o Supabase e será o espelho do inventário real.
        </p>

        <form method="get" className="mt-6 grid gap-4 md:grid-cols-[1.2fr_1fr_auto]">
          <select name="estoqueId" defaultValue={selectedEstoqueId} className="mc4-form-select rounded-2xl px-4 py-3 text-sm" required>
            <option value="" disabled>
              Escolha um estoque
            </option>
            {estoqueOptions.map((estoque) => (
              <option key={estoque.id} value={estoque.id}>
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

      <section className="glass-panel rounded-3xl border border-white/10 p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">Inventário do local</h3>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-cyan-100">
            {filteredRows.length} itens
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 table-surface">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Item</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Categoria</th>
                <th className="px-4 py-3 text-center font-medium">Quantidade</th>
                <th className="px-4 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-slate-950/30">
              {selectedEstoqueId ? (
                filteredRows.length > 0 ? (
                  filteredRows.map((row) => {
                    const item = Array.isArray(row.itens) ? row.itens[0] : row.itens;
                    const statusClass = row.quantidade > 0 ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200";

                    return (
                      <tr key={`${item?.nome ?? "item"}-${row.quantidade}`}>
                        <td className="px-4 py-3 font-medium text-white">{item?.nome ?? "Item excluído"}</td>
                        <td className="px-4 py-3 text-slate-300">{item?.cliente ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-300">{item?.categoria ?? "-"}</td>
                        <td className="px-4 py-3 text-center font-semibold text-white">{row.quantidade}</td>
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
                    <td className="px-4 py-5 text-center text-slate-400" colSpan={5}>
                      Nenhum item encontrado para esse filtro.
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td className="px-4 py-5 text-center text-slate-400" colSpan={5}>
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