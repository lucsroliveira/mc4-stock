"use client";

import { useActionState, useEffect, useRef } from "react";
import { createEstoque } from "@/lib/supabase/actions";
import { useToast } from "@/components/toast-context";

export function EstoqueForm() {
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  // useActionState para gerenciar o status pendente e respostas de erro da Server Action
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    try {
      await createEstoque(formData);
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: error.message || "Erro ao salvar o local." };
    }
  }, null);

  // Exibe o Toast correspondente após a conclusão da ação do servidor
  useEffect(() => {
    if (state?.success) {
      showToast("Local de estoque cadastrado com sucesso!", "success");
      formRef.current?.reset();
    } else if (state?.error) {
      showToast(state.error, "error");
    }
  }, [state, showToast]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 grid gap-4 md:grid-cols-2">
      <input 
        name="nome" 
        placeholder="Nome do local ou veículo" 
        className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" 
        required 
      />
      <select name="tipo" defaultValue="Regional" className="mc4-form-select rounded-2xl px-4 py-3 text-sm">
        <option value="Regional">Regional (Fixo)</option>
        <option value="Temporario">Temporário / Veículo</option>
      </select>
      
      {/* Campos de responsabilidade e contato para rastreabilidade operacional */}
      <input name="responsavel" placeholder="Responsável" className="mc4-form-input rounded-2xl px-4 py-3 text-sm" required />
      <input name="contato" placeholder="WhatsApp / contato" className="mc4-form-input rounded-2xl px-4 py-3 text-sm" required />
      <input name="endereco" placeholder="Endereço / placa" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" />
      <div className="md:col-span-2">
        <button 
          type="submit" 
          disabled={isPending} 
          className="mc4-btn-primary rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar local"}
        </button>
      </div>
    </form>
  );
}
