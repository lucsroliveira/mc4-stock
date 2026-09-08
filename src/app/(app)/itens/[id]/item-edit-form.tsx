"use client";

import { useTransition } from "react";
import { updateItem } from "@/lib/supabase/actions";
import { useToast } from "@/components/toast-context";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Option = { id: string; nome: string | null };

type ItemEditFormProps = {
  item: {
    id: string;
    nome: string | null;
    categoria: string | null;
    cliente: string | null;
    descricao: string | null;
    foto_url: string | null;
  };
  categoriaOptions: Option[];
  clienteOptions: Option[];
};

export function ItemEditForm({ item, categoriaOptions, clienteOptions }: ItemEditFormProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await updateItem(formData);
        showToast("Item atualizado com sucesso!", "success");
        router.push("/itens"); // Redireciona de volta ao catálogo
      } catch (error: any) {
        showToast(error.message || "Erro ao atualizar o item.", "error");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
      {/* ID do Item Oculto para a Server Action */}
      <input type="hidden" name="id" value={item.id} />

      {/* Nome do Item */}
      <div className="md:col-span-2 grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Nome do Item
        </label>
        <input
          name="nome"
          defaultValue={item.nome ?? ""}
          placeholder="Ex: Camisa Polo MC4 - Tamanho M"
          className="mc4-form-input rounded-2xl px-4 py-3 text-sm transition-all focus:border-[#EB5727]"
          required
        />
      </div>

      {/* Categoria */}
      <div className="grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Categoria
        </label>
        <select
          name="categoria"
          defaultValue={item.categoria ?? ""}
          className="mc4-form-select rounded-2xl px-4 py-3 text-sm transition-all focus:border-[#EB5727]"
          required
        >
          {categoriaOptions.map((c) => (
            <option key={c.id} value={c.nome ?? ""}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Cliente Proprietário */}
      <div className="grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Cliente Proprietário
        </label>
        <select
          name="cliente"
          defaultValue={item.cliente ?? ""}
          className="mc4-form-select rounded-2xl px-4 py-3 text-sm transition-all focus:border-[#EB5727]"
          required
        >
          {clienteOptions.map((cl) => (
            <option key={cl.id} value={cl.nome ?? ""}>
              {cl.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Upload de Imagem */}
      <div className="md:col-span-2 grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Imagem do Catálogo
        </label>
        <input type="hidden" name="foto_url" defaultValue={item.foto_url ?? ""} />
        <input
          type="file"
          name="foto_file"
          accept="image/*"
          className="mc4-form-input rounded-2xl px-4 py-3 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#EB5727]/10 file:text-[#EB5727] hover:file:bg-[#EB5727]/20 file:cursor-pointer transition-colors"
        />
      </div>

      {/* Descrição */}
      <div className="md:col-span-2 grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Descrição do Item
        </label>
        <textarea
          name="descricao"
          defaultValue={item.descricao ?? ""}
          placeholder="Descreva observações, tamanho, cor..."
          rows={3}
          className="mc4-form-textarea rounded-2xl px-4 py-3 text-sm transition-all focus:border-[#EB5727]"
        />
      </div>

      {/* Botões de Ação */}
      <div className="md:col-span-2 mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="mc4-btn-primary rounded-2xl w-full sm:w-auto px-6 py-3.5 text-sm font-semibold transition disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar alterações"}
        </button>
        <Link
          href="/itens"
          className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] w-full sm:w-auto px-6 py-3.5 text-center text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--panel-border)]/10 transition"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}