/**
 * ÁREA DE ADMINISTRAÇÃO
 * Permite ao administrador gerenciar (criar, editar e excluir) as listas
 * de Categorias e Clientes usadas no cadastro de itens.
 */
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCategoria, deleteCategoria, updateCategoria, createCliente, deleteCliente, updateCliente } from "@/lib/supabase/actions";
import { CategoriaRowEditor } from "@/components/categoria-row-editor";
import { ClienteRowEditor } from "@/components/cliente-row-editor";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const [{ data: categorias }, { data: clientes }] = await Promise.all([
    supabase.from("categorias").select("id, nome").order("nome", { ascending: true }),
    supabase.from("clientes").select("id, nome").order("nome", { ascending: true }),
  ]);

  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Categorias</h3>
          <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Admin
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Estas categorias aparecem no cadastro e na edição de itens.
        </p>

        <form action={createCategoria} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input name="nome" placeholder="Nome da categoria" className="mc4-form-input flex-1 rounded-2xl px-4 py-3 text-sm" required />
          <button type="submit" className="mc4-btn-primary rounded-2xl px-5 py-3 text-sm font-semibold transition">
            Adicionar categoria
          </button>
        </form>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--panel-border)]">
          <table className="min-w-full divide-y divide-[var(--panel-border)] text-sm">
            <thead className="bg-[var(--panel-border)]/20 text-[var(--foreground)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Categoria</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--panel-border)] bg-[var(--panel)]">
              {(categorias ?? []).length > 0 ? (
                (categorias ?? []).map((categoria) => (
                  <CategoriaRowEditor
                    key={categoria.id}
                    categoria={categoria}
                    updateAction={updateCategoria}
                    deleteAction={deleteCategoria}
                  />
                ))
              ) : (
                <tr>
                  <td className="px-4 py-5 text-center text-[var(--text-muted)]" colSpan={2}>
                    Nenhuma categoria cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Clientes</h3>
          <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Admin
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Estes clientes aparecem no cadastro e na edição de itens.
        </p>

        <form action={createCliente} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input name="nome" placeholder="Nome do cliente" className="mc4-form-input flex-1 rounded-2xl px-4 py-3 text-sm" required />
          <button type="submit" className="mc4-btn-primary rounded-2xl px-5 py-3 text-sm font-semibold transition">
            Adicionar cliente
          </button>
        </form>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--panel-border)]">
          <table className="min-w-full divide-y divide-[var(--panel-border)] text-sm">
            <thead className="bg-[var(--panel-border)]/20 text-[var(--foreground)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--panel-border)] bg-[var(--panel)]">
              {(clientes ?? []).length > 0 ? (
                (clientes ?? []).map((cliente) => (
                  <ClienteRowEditor
                    key={cliente.id}
                    cliente={cliente}
                    updateAction={updateCliente}
                    deleteAction={deleteCliente}
                  />
                ))
              ) : (
                <tr>
                  <td className="px-4 py-5 text-center text-[var(--text-muted)]" colSpan={2}>
                    Nenhum cliente cadastrado.
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
