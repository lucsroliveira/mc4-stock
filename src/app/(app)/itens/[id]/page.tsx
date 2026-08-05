import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateItem } from "@/lib/supabase/actions";
import { resolveSupabaseAssetUrl } from "@/lib/supabase/storage";

type ItemDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type NamedRelation = {
  id?: string | null;
  nome: string | null;
  tipo?: string | null;
};

type StockBalanceRow = {
  quantidade: number;
  estoques: NamedRelation | NamedRelation[] | null;
};

type MovementRow = {
  id: string;
  data_movimentacao: string;
  tipo: string;
  quantidade: number;
  observacao: string | null;
  origem: NamedRelation | NamedRelation[] | null;
  destino: NamedRelation | NamedRelation[] | null;
};

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: item }, { data: stockBalances }, { data: movementRows }] = await Promise.all([
    supabase
      .from("itens")
      .select("id, nome, categoria, cliente, descricao, foto_url, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("estoque_itens")
      .select("quantidade, estoques ( id, nome, tipo )")
      .eq("item_id", id)
      .order("quantidade", { ascending: false }),
    supabase
      .from("movimentacoes")
      .select("id, data_movimentacao, tipo, quantidade, observacao, origem:estoques!origem_id ( nome ), destino:estoques!destino_id ( nome )")
      .eq("item_id", id)
      .order("data_movimentacao", { ascending: false })
      .limit(20),
  ]);

  if (!item) {
    notFound();
  }

  const itemPhotoPreviewUrl = await resolveSupabaseAssetUrl(supabase, item.foto_url);
  const normalizedBalances = (stockBalances ?? []) as StockBalanceRow[];
  const totalUnidades = normalizedBalances.reduce((total, row) => total + (row.quantidade ?? 0), 0);
  const locaisAtivos = normalizedBalances.filter((row) => (row.quantidade ?? 0) > 0).length;

  const movementStats = (movementRows ?? []).reduce(
    (acc, row: MovementRow) => {
      if (row.tipo === "entrada") acc.entradas += row.quantidade ?? 0;
      if (row.tipo === "saida") acc.saidas += row.quantidade ?? 0;
      if (row.tipo === "transferencia") acc.transferencias += row.quantidade ?? 0;
      return acc;
    },
    { entradas: 0, saidas: 0, transferencias: 0 },
  );

  const movementHistory = (movementRows ?? []) as MovementRow[];

  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[#f4f7f9]">
              {itemPhotoPreviewUrl ? <img src={itemPhotoPreviewUrl} alt={item.nome ?? "Item"} className="h-full w-full object-cover" /> : null}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#00a5b5]">Detalhe do item</p>
              <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{item.nome ?? "Item sem nome"}</h1>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Cliente: <span className="text-[var(--foreground)]">{item.cliente ?? "-"}</span> | Categoria:{" "}
                <span className="text-[var(--foreground)]">{item.categoria ?? "-"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="rounded-2xl border border-[var(--panel-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-border)]/10"
            >
              Voltar ao dashboard
            </Link>
            <Link
              href="/itens"
              className="rounded-2xl border border-[var(--panel-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-border)]/10"
            >
              Ver todos os itens
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(0,165,181,0.08)] px-4 py-4 text-sm">
          <p className="text-[var(--text-muted)]">Saldo total</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{totalUnidades}</p>
        </article>
        <article className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(206,219,5,0.08)] px-4 py-4 text-sm">
          <p className="text-[var(--text-muted)]">Locais com saldo</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{locaisAtivos}</p>
        </article>
        <article className="rounded-2xl border border-[var(--panel-border)] bg-[rgba(235,87,39,0.08)] px-4 py-4 text-sm">
          <p className="text-[var(--text-muted)]">Movimentações</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{movementHistory.length}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Onde este item está</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Distribuição atual por local de estoque para facilitar localização e decisão de movimentação.
          </p>

          <div className="mt-4 space-y-3">
            {normalizedBalances.length > 0 ? (
              normalizedBalances.map((row, index) => {
                const estoque = Array.isArray(row.estoques) ? row.estoques[0] : row.estoques;
                return (
                  <div
                    key={`${estoque?.id ?? estoque?.nome ?? "sem-local"}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{estoque?.nome ?? "Local não identificado"}</p>
                      <p className="text-xs text-[var(--text-muted)]">{estoque?.tipo ?? "Estoque"}</p>
                    </div>
                    <span className="mc4-badge mc4-badge-lime">{row.quantidade ?? 0}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Nenhum saldo encontrado para este item.</p>
            )}
          </div>
        </article>

        <article className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Resumo de movimentação</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--panel-border)] bg-emerald-500/10 px-4 py-3 text-sm">
              <p className="text-[var(--text-muted)]">Entradas</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{movementStats.entradas}</p>
            </div>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-rose-500/10 px-4 py-3 text-sm">
              <p className="text-[var(--text-muted)]">Saídas</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{movementStats.saidas}</p>
            </div>
            <div className="rounded-2xl border border-[var(--panel-border)] bg-cyan-500/10 px-4 py-3 text-sm">
              <p className="text-[var(--text-muted)]">Transferências</p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{movementStats.transferencias}</p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--panel-border)]">
            <table className="min-w-full divide-y divide-[var(--panel-border)] text-sm">
              <thead className="bg-[var(--panel-border)]/20 text-[var(--foreground)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Origem / Destino</th>
                  <th className="px-4 py-3 text-right font-medium">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--panel-border)] bg-[var(--panel)]">
                {movementHistory.length > 0 ? (
                  movementHistory.map((movement) => {
                    const origem = Array.isArray(movement.origem) ? movement.origem[0] : movement.origem;
                    const destino = Array.isArray(movement.destino) ? movement.destino[0] : movement.destino;

                    return (
                      <tr key={movement.id} className="hover:bg-[var(--panel-border)]/10 transition-colors">
                        <td className="px-4 py-3 text-[var(--text-muted)]">{new Date(movement.data_movimentacao).toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 text-[var(--foreground)]">{movement.tipo}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{origem?.nome ?? "Externo"} → {destino?.nome ?? "Baixa"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">{movement.quantidade}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-5 text-center text-[var(--text-muted)]" colSpan={4}>
                      Nenhuma movimentação registrada para este item.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Dados do item</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Atualize os dados do item diretamente nesta tela. Após salvar, o dashboard e as listas são atualizados automaticamente.
        </p>

        <form action={updateItem} className="mt-4 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={item.id} />
          <input name="nome" defaultValue={item.nome ?? ""} placeholder="Nome do item" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" required />
          <select name="categoria" defaultValue={item.categoria ?? "Cenografia"} className="mc4-form-select rounded-2xl px-4 py-3 text-sm">
            <option value="Cenografia">Cenografia</option>
            <option value="Vestuario">Vestuário</option>
            <option value="Brindes">Brindes</option>
            <option value="OOH">OOH</option>
            <option value="Ativação">Ativação</option>
          </select>
          <select name="cliente" defaultValue={item.cliente ?? "Interno / MC4"} className="mc4-form-select rounded-2xl px-4 py-3 text-sm">
            <option value="Interno / MC4">Interno / MC4</option>
            <option value="Esportes da Sorte">Esportes da Sorte</option>
            <option value="Boticário">Boticário</option>
            <option value="MOOD">MOOD</option>
            <option value="Cenoura e Bronze">Cenoura e Bronze</option>
          </select>
          <input name="foto_url" defaultValue={item.foto_url ?? ""} placeholder="URL da foto ou path do Storage" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" />
          <input type="file" name="foto_file" accept="image/*" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" />
          <textarea name="descricao" defaultValue={item.descricao ?? ""} rows={4} placeholder="Descrição do item" className="mc4-form-textarea rounded-2xl px-4 py-3 text-sm md:col-span-2" />
          <div className="md:col-span-2">
            <button type="submit" className="mc4-btn-primary rounded-2xl px-5 py-3 text-sm font-semibold transition">
              Salvar alterações
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
