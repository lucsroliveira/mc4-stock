import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEstoque, deleteEstoque, updateEstoque } from "@/lib/supabase/actions";
import { EstoqueRowEditor } from "@/components/estoque-row-editor";

export default async function EstoquesPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: estoques }, { data: saldos }] = await Promise.all([
    supabase.from("estoques").select("id, nome, tipo, responsavel, contato, endereco").order("nome", { ascending: true }),
    supabase.from("estoque_itens").select("estoque_id, quantidade"),
  ]);

  type EstoqueSaldoRow = {
    estoque_id: string;
    quantidade: number;
  };

  const resumoPorEstoque = new Map<string, { itens: number; total: number }>();
  (saldos ?? []).forEach((row: EstoqueSaldoRow) => {
    const current = resumoPorEstoque.get(row.estoque_id) ?? { itens: 0, total: 0 };
    current.itens += 1;
    current.total += row.quantidade ?? 0;
    resumoPorEstoque.set(row.estoque_id, current);
  });

  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Novo estoque</h3>
        <form action={createEstoque} className="mt-4 grid gap-4 md:grid-cols-2">
          <input name="nome" placeholder="Nome do local ou veículo" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" required />
          <select name="tipo" defaultValue="Regional" className="mc4-form-select rounded-2xl px-4 py-3 text-sm">
            <option value="Regional">Regional (Fixo)</option>
            <option value="Temporario">Temporário / Veículo</option>
          </select>
          <input name="responsavel" placeholder="Responsável" className="mc4-form-input rounded-2xl px-4 py-3 text-sm" required />
          <input name="contato" placeholder="WhatsApp / contato" className="mc4-form-input rounded-2xl px-4 py-3 text-sm" required />
          <input name="endereco" placeholder="Endereço / placa" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" />
          <div className="md:col-span-2">
            <button type="submit" className="mc4-btn-primary rounded-2xl px-5 py-3 text-sm font-semibold transition">Salvar local</button>
          </div>
        </form>
      </section>

      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Locais cadastrados</h3>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--panel-border)]">
          <table className="min-w-full divide-y divide-[var(--panel-border)] text-sm">
            <thead className="bg-[var(--panel-border)]/20 text-[var(--foreground)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Local</th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">Responsável</th>
                <th className="px-4 py-3 text-left font-medium">Contato</th>
                <th className="px-4 py-3 text-left font-medium">Saldo / Itens</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--panel-border)] bg-[var(--panel)]">
              {(estoques ?? []).length > 0 ? (
                estoques?.map((estoque: { id: string; nome: string | null; tipo: string | null; responsavel: string | null; contato: string | null; endereco: string | null }) => {
                  const resumo = resumoPorEstoque.get(estoque.id) ?? { itens: 0, total: 0 };

                  return (
                    <tr key={estoque.id}>
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">{estoque.nome}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{estoque.tipo === "Temporario" ? "Temporário / Veículo" : "Regional"}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{estoque.responsavel ?? "-"}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{estoque.contato ?? "-"}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {resumo.total} unidades em {resumo.itens} vínculos
                      </td>
                      <td className="px-4 py-3 text-right">
                        <EstoqueRowEditor estoque={estoque} updateAction={updateEstoque} deleteAction={deleteEstoque} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-5 text-center text-[var(--text-muted)]" colSpan={6}>
                    Nenhum estoque cadastrado.
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