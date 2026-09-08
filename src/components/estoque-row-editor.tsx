"use client";

import { useRef, useState, useTransition } from "react";
import type { deleteEstoque, updateEstoque } from "@/lib/supabase/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast-context";
import { SearchableSelect } from "@/components/searchable-select"; // Importando o seletor inteligente

type EstoqueRow = {
  id: string;
  nome: string | null;
  tipo: string | null;
  responsavel: string | null;
  contato: string | null;
  endereco: string | null;
};

type EstoqueRowEditorProps = {
  estoque: EstoqueRow;
  updateAction: typeof updateEstoque;
  deleteAction: typeof deleteEstoque;
};

export function EstoqueRowEditor({ estoque, updateAction, deleteAction }: EstoqueRowEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  const { showToast } = useToast();
  const [isPendingUpdate, startUpdateTransition] = useTransition();
  const [isPendingDelete, startDeleteTransition] = useTransition();

  // Estado local para o seletor customizado de Tipo de Estoque
  const [tipo, setTipo] = useState(estoque.tipo ?? "Regional");

  // Executa a transação de atualização inline e emite o feedback
  const handleUpdate = (formData: FormData) => {
    startUpdateTransition(async () => {
      try {
        await updateAction(formData);
        showToast("Local atualizado com sucesso!", "success");
        setIsEditing(false);
      } catch (error: any) {
        showToast(error.message || "Erro ao atualizar o local.", "error");
      }
    });
  };

  // Executa a transação de exclusão e emite o feedback
  const handleDelete = (formData: FormData) => {
    startDeleteTransition(async () => {
      try {
        await deleteAction(formData);
        showToast("Local removido do cadastro!", "success");
        setShowDeleteConfirm(false);
      } catch (error: any) {
        showToast(error.message || "Erro ao excluir o local.", "error");
      }
    });
  };

  const tipoOptions = [
    { id: "Regional", nome: "Regional (Fixo)" },
    { id: "Temporario", nome: "Temporário / Veículo" },
  ];

  return (
    <>
      {isEditing ? (
        <div className="rounded-[1.5rem] border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-xl text-left">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Editar local</p>
              <h4 className="mt-1 text-lg font-semibold text-[var(--foreground)]">{estoque.nome ?? "Local"}</h4>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-full border border-[var(--panel-border)] px-3 py-1 text-sm text-[var(--text-muted)] hover:bg-[var(--panel-border)]/10 transition-colors"
            >
              Fechar
            </button>
          </div>

          <form action={handleUpdate} className="grid gap-4 md:grid-cols-2">
            {/* Inputs ocultos necessários para envio via HTML FormData */}
            <input type="hidden" name="id" value={estoque.id} />
            <input type="hidden" name="tipo" value={tipo} />

            {/* Nome do Local */}
            <div className="md:col-span-2 grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Nome do Local
              </label>
              <input
                name="nome"
                defaultValue={estoque.nome ?? ""}
                placeholder="Nome do local"
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
                defaultValue={estoque.responsavel ?? ""}
                placeholder="Responsável"
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
                defaultValue={estoque.contato ?? ""}
                placeholder="WhatsApp / contato"
                className="mc4-form-input rounded-2xl px-4 py-3 text-sm"
                required
              />
            </div>

            {/* Endereço / Placa */}
            <div className="md:col-span-2 grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Endereço / Placa
              </label>
              <input
                name="endereco"
                defaultValue={estoque.endereco ?? ""}
                placeholder="Endereço / placa"
                className="mc4-form-input rounded-2xl px-4 py-3 text-sm"
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2 md:col-span-2 mt-2">
              <button
                type="submit"
                disabled={isPendingUpdate}
                className="mc4-btn-primary rounded-2xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPendingUpdate ? "Salvando..." : "Salvar alterações"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-2xl border border-[var(--panel-border)] px-5 py-2.5 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--panel-border)]/10 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setTipo(estoque.tipo ?? "Regional");
              setIsEditing(true);
            }}
            className="mc4-badge rounded-full border border-[#EB5727]/20 bg-[#EB5727]/10 px-4 py-2 text-[var(--foreground)]"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="mc4-badge mc4-badge-orange rounded-full px-4 py-2"
          >
            Excluir
          </button>
        </div>
      )}

      <form ref={deleteFormRef} action={handleDelete} className="hidden">
        <input type="hidden" name="id" value={estoque.id} />
      </form>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Excluir local"
        description={`Deseja realmente remover ${estoque.nome ?? "este local"} do cadastro?`}
        confirmLabel="Sim, excluir"
        onConfirm={() => {
          deleteFormRef.current?.requestSubmit();
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
