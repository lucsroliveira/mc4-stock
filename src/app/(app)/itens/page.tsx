import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createItem, deleteItem, updateItem } from "@/lib/supabase/actions";
import { ItemRowEditor } from "@/components/item-row-editor";

export default async function ItensPage() {
  const supabase = await createSupabaseServerClient();
  type ItemRow = {
    id: string;
    nome: string | null;
    categoria: string | null;
    cliente: string | null;
    descricao: string | null;
    foto_url: string | null;
    created_at: string | null;
  };

  const { data: itens } = await supabase
    .from("itens")
    .select("id, nome, categoria, cliente, descricao, foto_url, created_at")
    .order("created_at", { ascending: false });

  const itemRows = (itens ?? []) as ItemRow[];

  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-3xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white">Novo item</h3>
        <form action={createItem} className="mt-4 grid gap-4 md:grid-cols-2">
          <input name="nome" placeholder="Nome do item" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" required />
          <select name="categoria" defaultValue="Cenografia" className="mc4-form-select rounded-2xl px-4 py-3 text-sm">
            <option value="Cenografia">Cenografia</option>
            <option value="Vestuario">Vestuário</option>
            <option value="Brindes">Brindes</option>
            <option value="OOH">OOH</option>
            <option value="Ativação">Ativação</option>
          </select>
          <select name="cliente" defaultValue="Interno / MC4" className="mc4-form-select rounded-2xl px-4 py-3 text-sm">
            <option value="Interno / MC4">Interno / MC4</option>
            <option value="Esportes da Sorte">Esportes da Sorte</option>
            <option value="Boticário">Boticário</option>
            <option value="MOOD">MOOD</option>
            <option value="Cenoura e Bronze">Cenoura e Bronze</option>
          </select>
          <input name="foto_url" placeholder="URL da foto (opcional)" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" />
          <textarea name="descricao" placeholder="Descrição do item" rows={3} className="mc4-form-textarea rounded-2xl px-4 py-3 text-sm md:col-span-2" />
          <div className="md:col-span-2">
            <button type="submit" className="mc4-btn-primary rounded-2xl px-5 py-3 text-sm font-semibold transition">Salvar item</button>
          </div>
        </form>
      </section>

      <section className="glass-panel rounded-3xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white">Itens cadastrados</h3>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 table-surface">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Item</th>
                <th className="px-4 py-3 text-left font-medium">Categoria</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Descrição</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-slate-950/30">
              {itemRows.length > 0 ? (
                itemRows.map((item) => <ItemRowEditor key={item.id} item={item} updateAction={updateItem} deleteAction={deleteItem} />)
              ) : (
                <tr>
                  <td className="px-4 py-5 text-center text-slate-400" colSpan={5}>
                    Nenhum item cadastrado.
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