"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createItem } from "@/lib/supabase/actions";
import { useToast } from "@/components/toast-context";
import { SearchableSelect } from "@/components/searchable-select"; // Importando o seletor inteligente unificado

type ItemFormProps = {
  categoriaOptions: { id: string; nome: string | null }[];
  clienteOptions: { id: string; nome: string | null }[];
};

export function ItemForm({ categoriaOptions, clienteOptions }: ItemFormProps) {
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  // Estados locais para controlar os seletores customizados
  const [categoria, setCategoria] = useState("");
  const [cliente, setCliente] = useState("");

  // useActionState encapsula a Server Action de criação de itens de forma segura
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    try {
      await createItem(formData);
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: error.message || "Erro ao salvar o item." };
    }
  }, null);

  // Monitora o retorno da Server Action para emitir o feedback do Toast
  useEffect(() => {
    if (state?.success) {
      showToast("Item cadastrado com sucesso!", "success");
      formRef.current?.reset();
      // Reseta os estados locais de seleção customizada
      setCategoria("");
      setCliente("");
    } else if (state?.error) {
      showToast(state.error, "error");
    }
  }, [state, showToast]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 grid gap-4 md:grid-cols-2">
      {/* Nome do Item com rótulo descritivo */}
      <div className="md:col-span-2 grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Nome do Item
        </label>
        <input
          name="nome"
          placeholder="Ex: Camisa Polo MC4 - Tamanho M"
          className="mc4-form-input rounded-2xl px-4 py-3 text-sm"
          required
        />
      </div>

      {/* INPUTS OCULTOS: Necessários para que os valores dos SearchableSelects 
          sejam incluídos automaticamente no FormData enviado à Server Action */}
      <input type="hidden" name="categoria" value={categoria} />
      <input type="hidden" name="cliente" value={cliente} />

      {/* Categoria Inteligente */}
      <div className="grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Categoria
        </label>
        <SearchableSelect
          options={categoriaOptions.map((c) => ({ id: c.nome ?? "", nome: c.nome }))}
          value={categoria}
          onChange={setCategoria}
          placeholder="Buscar ou escolher categoria..."
        />
      </div>

      {/* Cliente Proprietário Inteligente */}
      <div className="grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Cliente Proprietário
        </label>
        <SearchableSelect
          options={clienteOptions.map((cl) => ({ id: cl.nome ?? "", nome: cl.nome }))}
          value={cliente}
          onChange={setCliente}
          placeholder="Buscar ou escolher cliente..."
        />
      </div>

      {/* Input de Arquivo (Foto do Item) Personalizado */}
      <div className="md:col-span-2 grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Imagem do Catálogo
        </label>
        <input
          type="file"
          name="foto_file"
          accept="image/*"
          className="mc4-form-input rounded-2xl px-4 py-3 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#EB5727]/10 file:text-[#EB5727] hover:file:bg-[#EB5727]/20 file:cursor-pointer transition-colors"
        />
      </div>

      {/* Descrição do Item */}
      <div className="md:col-span-2 grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Descrição do Item
        </label>
        <textarea
          name="descricao"
          placeholder="Descreva observações, tamanho, cor ou número de série do produto..."
          rows={3}
          className="mc4-form-textarea rounded-2xl px-4 py-3 text-sm"
        />
      </div>

      <div className="md:col-span-2 mt-2">
        <button
          type="submit"
          disabled={isPending}
          className="mc4-btn-primary rounded-2xl w-full sm:w-auto px-6 py-3.5 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar item"}
        </button>
      </div>
    </form>
  );
}