"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createEstoque } from "@/lib/supabase/actions";
import { useToast } from "@/components/toast-context";
import { SearchableSelect } from "@/components/searchable-select"; // Importando o seletor inteligente

export function EstoqueForm() {
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  // Estado local para o seletor customizado de Tipo de Estoque
  const [tipo, setTipo] = useState("Regional");

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
      setTipo("Regional"); // Reseta para o valor padrão
    } else if (state?.error) {
      showToast(state.error, "error");
    }
  }, [state, showToast]);

  const tipoOptions = [
    { id: "Regional", nome: "Regional (Fixo)" },
    { id: "Temporario", nome: "Temporário / Veículo" },
  ];

  return (
    <form ref={formRef} action={formAction} className="mt-4 grid gap-4 md:grid-cols-2">
      {/* Campo oculto para envio do tipo de estoque via FormData */}
      <input type="hidden" name="tipo" value={tipo} />

      {/* Nome do Local */}
      <div className="md:col-span-2 grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Nome do Local ou Veículo
        </label>
        <input
          name="nome"
          placeholder="Ex: Almoxarifado Central ou Veículo 02"
          className="mc4-form-input rounded-2xl px-4 py-3 text-sm"
          required
        />
      </div>

      {/* Tipo de Local Inteligente */}
      <div className="grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Tipo de Estoque
        </label>
        <SearchableSelect
          options={tipoOptions}
          value={tipo}
          onChange={setTipo}
          placeholder="Selecione o tipo..."
          showImages={false} // Sem miniatura para tipo de estoque
        />
      </div>

      {/* Responsável */}
      <div className="grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Responsável
        </label>
        <input
          name="responsavel"
          placeholder="Nome do responsável pelo estoque"
          className="mc4-form-input rounded-2xl px-4 py-3 text-sm"
          required
        />
      </div>

      {/* Contato */}
      <div className="grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          WhatsApp / Contato
        </label>
        <input
          name="contato"
          placeholder="Ex: (81) 9 9999-9999"
          className="mc4-form-input rounded-2xl px-4 py-3 text-sm"
          required
        />
      </div>

      {/* Endereço / Placa */}
      <div className="grid gap-1.5 md:col-span-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Endereço ou Placa do Veículo
        </label>
        <input
          name="endereco"
          placeholder="Rua, número, galpão ou placa do veículo de campo (opcional)"
          className="mc4-form-input rounded-2xl px-4 py-3 text-sm"
        />
      </div>

      <div className="md:col-span-2 mt-2">
        <button
          type="submit"
          disabled={isPending}
          className="mc4-btn-primary rounded-2xl px-6 py-3.5 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 w-full sm:w-auto"
        >
          {isPending ? "Salvando..." : "Salvar local"}
        </button>
      </div>
    </form>
  );
}
