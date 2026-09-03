"use client";

import { useActionState, useEffect, useRef } from "react";
import { createItem } from "@/lib/supabase/actions";
import { useToast } from "@/components/toast-context";

type ItemFormProps = {
  categoriaOptions: { id: string; nome: string | null }[];
  clienteOptions: { id: string; nome: string | null }[];
};

export function ItemForm({ categoriaOptions, clienteOptions }: ItemFormProps) {
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

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
    } else if (state?.error) {
      showToast(state.error, "error");
    }
  }, [state, showToast]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 grid gap-4 md:grid-cols-2">
      <input 
        name="nome" 
        placeholder="Nome do item" 
        className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" 
        required 
      />
      
      {/* Categorias gerenciadas pelo administrador em /admin */}
      <select 
        name="categoria" 
        defaultValue={categoriaOptions[0]?.nome ?? ""} 
        className="mc4-form-select rounded-2xl px-4 py-3 text-sm"
      >
        {categoriaOptions.map((categoria) => (
          <option key={categoria.id} value={categoria.nome ?? ""}>
            {categoria.nome}
          </option>
        ))}
      </select>

      {/* Clientes gerenciados pelo administrador em /admin */}
      <select 
        name="cliente" 
        defaultValue={clienteOptions[0]?.nome ?? ""} 
        className="mc4-form-select rounded-2xl px-4 py-3 text-sm"
      >
        {clienteOptions.map((cliente) => (
          <option key={cliente.id} value={cliente.nome ?? ""}>
            {cliente.nome}
          </option>
        ))}
      </select>

      <input 
        name="foto_url" 
        placeholder="URL da foto ou path salvo no bucket (opcional)" 
        className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" 
      />
      <input 
        type="file" 
        name="foto_file" 
        accept="image/*" 
        className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" 
      />
      <textarea 
        name="descricao" 
        placeholder="Descrição do item" 
        rows={3} 
        className="mc4-form-textarea rounded-2xl px-4 py-3 text-sm md:col-span-2" 
      />
      
      <div className="md:col-span-2">
        <button 
          type="submit" 
          disabled={isPending}
          className="mc4-btn-primary rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar item"}
        </button>
      </div>
    </form>
  );
}