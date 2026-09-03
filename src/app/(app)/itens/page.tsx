/**
 * GESTÃO DE CATÁLOGO - MÓDULO DE ITENS
 * 1. createSupabaseServerClient: Inicializa a conexão com o banco via Server Side.
 * 2. create/delete/updateItem: Server Actions para manipulação direta da tabela 'itens'.
 * 3. ItemsSearchTable: Componente cliente que gerencia a busca e filtragem de itens.
 * 4. resolveSupabaseAssetUrl: Utilitário que transforma o path do Storage em URL visível.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createItem, deleteItem, reactivateItem, updateItem } from "@/lib/supabase/actions";
import ItemsSearchTable from "@/components/ItemsSearchTable";
import { resolveSupabaseAssetUrl } from "@/lib/supabase/storage";
import { ItemForm } from "@/components/item-form"; // Chamando o novo formulário Client-side

export default async function ItensPage() {
  const supabase = await createSupabaseServerClient();
  type ItemRow = {
    id: string;
    nome: string | null;
    categoria: string | null;
    cliente: string | null;
    descricao: string | null;
    foto_url: string | null;
    ativo: boolean;
    foto_preview_url: string | null;
    created_at: string | null;
  };

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();
  const isAdmin = profile?.role === "admin";

  // Busca a lista mestra de itens ordenada pelos cadastros mais recentes.
  const { data: itens } = await supabase
    .from("itens")
    .select("id, nome, categoria, cliente, descricao, foto_url, ativo, created_at")
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  // PROCESSO DE RESOLUÇÃO DE MÍDIA:
  // Para cada item, verificamos se existe um path em 'foto_url' e solicitamos
  // ao Supabase Storage uma URL válida para renderização do preview.
  const itemRows = await Promise.all(
    ((itens ?? []) as Omit<ItemRow, "foto_preview_url">[]).map(async (item) => ({
      ...item,
      foto_preview_url: await resolveSupabaseAssetUrl(supabase, item.foto_url),
    }))
  );

  const { data: inactiveItems } = isAdmin
    ? await supabase
        .from("itens")
        .select("id, nome, categoria, cliente, descricao, created_at")
        .eq("ativo", false)
        .order("created_at", { ascending: false })
    : { data: [] as never[] };

  const [{ data: categoriaRows }, { data: clienteRows }] = await Promise.all([
    supabase.from("categorias").select("id, nome").order("nome", { ascending: true }),
    supabase.from("clientes").select("id, nome").order("nome", { ascending: true }),
  ]);
  const categoriaOptions = categoriaRows ?? [];
  const clienteOptions = clienteRows ?? [];

  return (
    <div className="grid gap-6">
      {profile?.role !== "cliente" && (
        <section className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Novo item</h3>
          {/* O formulário envia os dados reativamente pelo componente cliente integrado ao useToast */}
          <ItemForm categoriaOptions={categoriaOptions} clienteOptions={clienteOptions} />
        </section>
      )}

      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Itens cadastrados</h3>
        
        {/* Tabela de itens com busca, paginação e o ItemRowEditor original preservado */}
        <ItemsSearchTable
          initialItems={itemRows}
          updateAction={updateItem}
          deleteAction={deleteItem}
          categoriaOptions={categoriaOptions}
          clienteOptions={clienteOptions}
        />
      </section>

      {isAdmin ? (
        <section className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Itens inativos</h3>
            <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Admin
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Esta aba lista os itens desativados por exclusão lógica. Você pode reativar quando precisar voltar o item para a operação.
          </p>

          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--panel-border)]">
            <table className="min-w-full divide-y divide-[var(--panel-border)] text-sm">
              <thead className="bg-[var(--panel-border)]/20 text-[var(--foreground)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Item</th>
                  <th className="px-4 py-3 text-left font-medium">Categoria</th>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Descrição</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--panel-border)] bg-[var(--panel)]">
                {(inactiveItems ?? []).length > 0 ? (
                  (inactiveItems ?? []).map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">{item.nome ?? "Item"}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{item.categoria ?? "-"}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{item.cliente ?? "-"}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{item.descricao ?? "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <form action={reactivateItem}>
                          <input type="hidden" name="id" value={item.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
                          >
                            Reativar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-5 text-center text-[var(--text-muted)]" colSpan={5}>
                      Nenhum item inativo encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}