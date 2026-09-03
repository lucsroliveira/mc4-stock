/**
 * GESTÃO DE ESTOQUES - CAMADA DE IMPORTAÇÃO
 * 1. createSupabaseServerClient: Gerencia a sessão do lado do servidor.
 * 2. create/delete/updateEstoque: Server Actions que encapsulam a lógica de
 *    persistência no Supabase, garantindo revalidação automática da página. [3]
 * 3. EstoqueRowEditor: Componente cliente para edição em linha (inline editing).
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEstoque, deleteEstoque, updateEstoque } from "@/lib/supabase/actions";
import { EstoqueRowEditor } from "@/components/estoque-row-editor";
import { EstoqueForm } from "@/components/estoque-form"; // Importação do novo formulário com Toast

export default async function EstoquesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();
  const userRole = profile?.role ?? "cliente";

  // OTIMIZAÇÃO: Busca em paralelo a definição dos estoques e a tabela de junção de saldos.
  // Isso permite calcular quantos itens existem em cada local sem múltiplas idas ao banco.
  const [{ data: estoques }, { data: saldos }] = await Promise.all([
    supabase.from("estoques").select("id, nome, tipo, responsavel, contato, endereco").order("nome", { ascending: true }),
    supabase.from("estoque_itens").select("estoque_id, quantidade"),
  ]);

  type EstoqueSaldoRow = {
    estoque_id: string;
    quantidade: number;
  };

  // LÓGICA DE NEGÓCIO: Agrega o saldo bruto por ID de estoque utilizando um Map.
  // Resolve o problema de transformar linhas individuais de itens em um resumo por local.
  const resumoPorEstoque = new Map<string, { itens: number; total: number }>();
  (saldos ?? []).forEach((row: EstoqueSaldoRow) => {
    const current = resumoPorEstoque.get(row.estoque_id) ?? { itens: 0, total: 0 };
    current.itens += 1;
    current.total += row.quantidade ?? 0;
    resumoPorEstoque.set(row.estoque_id, current);
  });

  return (
    <div className="grid gap-6">
      {/* EXCLUSIVO PARA OPERADORES E ADMINS: Clientes não visualizam o formulário de cadastro */}
      {userRole !== "cliente" && (
        <section className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Novo estoque</h3>
          {/* Componente reativo que integra o useToast e useActionState */}
          <EstoqueForm />
        </section>
      )}

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
                {/* Oculta o cabeçalho de ações caso o usuário seja cliente */}
                {userRole !== "cliente" && <th className="px-4 py-3 text-right font-medium">Ações</th>}
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
                      {/* Oculta as ações de edição e exclusão para perfis com nível "Cliente" */}
                      {userRole !== "cliente" && (
                        <td className="px-4 py-3 text-right">
                          <EstoqueRowEditor estoque={estoque} updateAction={updateEstoque} deleteAction={deleteEstoque} />
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-5 text-center text-[var(--text-muted)]" colSpan={userRole === "cliente" ? 5 : 6}>
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