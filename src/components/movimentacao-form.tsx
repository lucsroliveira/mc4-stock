"use client";

import { useActionState, useMemo, useState, useEffect } from "react";
import { createMovimentacao } from "@/lib/supabase/actions";
import { useToast } from "@/components/toast-context";
import { SearchableSelect } from "@/components/searchable-select"; // Importando o seletor inteligente

type ItemOption = { id: string; nome: string | null; fotoPreviewUrl?: string | null };
type EstoqueOption = { id: string; nome: string | null };
type MovimentacaoFormProps = { itemRows: ItemOption[]; estoqueRows: EstoqueOption[]; balances: any[]; };

export function MovimentacaoForm({ itemRows, estoqueRows, balances }: MovimentacaoFormProps) {
  const { showToast } = useToast(); // Consumindo o contexto de Toasts
  const [actionError, submitAction, isPending] = useActionState(createMovimentacao, null);
  const [tipo, setTipo] = useState("transferencia");
  const [itemId, setItemId] = useState("");
  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [quantidade, setQuantidade] = useState<number | "">(""); // Controlado para reset reativo
  const [observacao, setObservacao] = useState(""); // Controlado para reset reativo
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItemBalances = useMemo(() => balances.filter((entry) => entry.item_id === itemId), [balances, itemId]);
  const currentOriginBalance = selectedItemBalances.find((entry) => entry.estoque_id === origemId)?.quantidade ?? 0;
  const origemNome = estoqueRows.find((estoque) => estoque.id === origemId)?.nome ?? "o local selecionado";
  const destinoNome = estoqueRows.find((estoque) => estoque.id === destinoId)?.nome ?? "o destino selecionado";

  const isEntrada = tipo === "entrada";
  const isSaida = tipo === "saida";
  const isTransferencia = tipo === "transferencia";

  // EFEITO DE AUDITORIA VISUAL: Captura o término da Server Action para exibir o Toast correspondente
  useEffect(() => {
    if (isPending) {
      setIsSubmitting(true);
    }
    if (!isPending && isSubmitting) {
      setIsSubmitting(false);
      if (!actionError?.error) {
        showToast("Movimentação registrada com sucesso!", "success");
        // Reseta todos os estados do formulário após a gravação bem-sucedida
        setItemId("");
        setOrigemId("");
        setDestinoId("");
        setQuantidade("");
        setObservacao("");
      } else {
        showToast(actionError.error, "error");
      }
    }
  }, [isPending, isSubmitting, actionError, showToast]);

  // Opções estruturadas para o Tipo de Movimentação (sem miniatura)
  const tipoOptions = [
    { id: "transferencia", nome: "Transferência" },
    { id: "entrada", nome: "Entrada" },
    { id: "saida", nome: "Saída" },
  ];

  // Opções de Estoques (com opção de limpar seleção se for opcional)
  const estoqueOptionsMapped = useMemo(() => {
    return [
      { id: "", nome: "Sem seleção / Limpar" },
      ...estoqueRows.map((e) => ({ id: e.id, nome: e.nome })),
    ];
  }, [estoqueRows]);

  return (
    <form action={submitAction} className="mt-6 grid gap-4 md:grid-cols-2">
      {/* Inputs ocultos necessários para envio via HTML FormData */}
      <input type="hidden" name="item_id" value={itemId} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="origem_id" value={origemId} />
      <input type="hidden" name="destino_id" value={destinoId} />
      
      {/* Campo de Item (Único com Miniatura) */}
      <label className="grid gap-2 md:col-span-2">
        <span className="text-sm font-medium text-[var(--text-muted)]">Item</span>
        <SearchableSelect
          options={itemRows}
          value={itemId}
          onChange={(value) => {
            setItemId(value);
            setOrigemId("");
            setDestinoId("");
          }}
          placeholder="Selecione o item pelo nome..."
          showImages={true} // ATIVADO: Mostra miniaturas visuais do catálogo apenas para Itens!
        />
      </label>

      {/* Campo de Tipo de Movimentação (Sem Miniatura) */}
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[var(--text-muted)]">Tipo de movimentação</span>
        <SearchableSelect
          options={tipoOptions}
          value={tipo}
          onChange={(value) => {
            setTipo(value);
            if (value === "entrada") {
              setOrigemId("");
            }
            if (value === "saida") {
              setDestinoId("");
            }
          }}
          placeholder="Selecione o tipo..."
          showImages={false} // DESATIVADO: Sem miniaturas visuais
        />
      </label>

      {/* Campo de Quantidade */}
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[var(--text-muted)]">Quantidade</span>
        <input
          name="quantidade"
          type="number"
          min="1"
          max={isSaida && origemId ? currentOriginBalance : undefined}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value ? Number(e.target.value) : "")}
          placeholder="Quantidade"
          className="mc4-form-input rounded-2xl px-4 py-3 text-sm transition-all focus:border-[#EB5727]"
          required
        />
      </label>

      {/* Campo de Origem (Sem Miniatura) */}
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[var(--text-muted)]">Origem</span>
        <SearchableSelect
          options={estoqueOptionsMapped}
          value={origemId}
          onChange={setOrigemId}
          placeholder={isEntrada ? "Origem não usada em entrada" : "Origem opcional"}
          showImages={false} // DESATIVADO: Sem miniaturas visuais
          disabled={isEntrada}
        />
      </label>

      {/* Campo de Destino (Sem Miniatura) */}
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[var(--text-muted)]">Destino</span>
        <SearchableSelect
          options={estoqueOptionsMapped}
          value={destinoId}
          onChange={setDestinoId}
          placeholder={isSaida ? "Destino não usado em saída" : "Destino opcional"}
          showImages={false} // DESATIVADO: Sem miniaturas visuais
          disabled={isSaida}
        />
      </label>

      {itemId ? (
        <div className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)] md:col-span-2">
          {isEntrada ? (
            <p>Entrada registrada no destino escolhido e o saldo será somado ao local informado.</p>
          ) : (
            <p>
              Saldo atual em {origemNome}: <span className="font-semibold text-[var(--text-muted)]">{currentOriginBalance}</span> unidade(s).
            </p>
          )}
          {isTransferencia && destinoId ? (
            <p className="mt-2">
              Saldo atual em {destinoNome}: <span className="font-semibold text-[var(--text-muted)]">{currentOriginBalance}</span> unidade(s).
            </p>
          ) : null}
          {isSaida && !origemId ? <p className="mt-2">Escolha a origem para validar o saldo disponível antes de salvar.</p> : null}
        </div>
      ) : null}

      {/* Campo de Motivo / Observação */}
      <label className="grid gap-2 md:col-span-2">
        <span className="text-sm font-medium text-[var(--text-muted)]">Motivo / observação</span>
        <textarea 
          name="observacao" 
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          rows={3} 
          placeholder="Motivo / observação" 
          className="mc4-form-textarea rounded-2xl px-4 py-3 text-sm transition-all focus:border-[#EB5727]" 
          required 
        />
      </label>

      <div className="md:col-span-2">
        {actionError?.error ? <p className="mb-3 text-sm font-medium text-red-600" role="alert">{actionError.error}</p> : null}
        <button type="submit" disabled={isPending} className="mc4-btn-primary rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60">
          {isPending ? "Salvando..." : "Confirmar movimentação"}
        </button>
      </div>
    </form>
  );
}