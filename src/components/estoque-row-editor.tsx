"use client";

import { useRef, useState, useTransition } from "react";
import type { deleteEstoque, updateEstoque } from "@/lib/supabase/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast-context";

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

  return (
    <>
      {isEditing ? (
        <div className="rounded-[1.5rem] border border-[var(--panel-border)] bg-[var(--panel)] p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Editar local</p>
              <h4 className="mt-1 text-lg font-semibold text-[var(--foreground)]">{estoque.nome ?? "Local"}</h4>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="rounded-full border border-[var(--panel-border)] px-3 py-1 text-sm text-[var(--text-muted)]">
              Fechar
            </button>
          </div>
          <form action={handleUpdate} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="id" value={estoque.id} />
            <input name="nome" defaultValue={estoque.nome ?? ""} placeholder="Nome do local" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" required />
            <select name="tipo" defaultValue={estoque.tipo ?? "Regional"} className="mc4-form-select rounded-2xl px-4 py-3 text-sm">
              <option value="Regional">Regional (Fixo)</option>
              <option value="Temporario">Temporário / Veículo</option>
            </select>
            <input name="responsavel" defaultValue={estoque.responsavel ?? ""} placeholder="Responsável" className="mc4-form-input rounded-2xl px-4 py-3 text-sm" required />
            <input name="contato" defaultValue={estoque.contato ?? ""} placeholder="WhatsApp / contato" className="mc4-form-input rounded-2xl px-4 py-3 text-sm" required />
            <input name="endereco" defaultValue={estoque.endereco ?? ""} placeholder="Endereço / placa" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" />
            <div className="flex gap-2 md:col-span-2">
              <button type="submit" disabled={isPendingUpdate} className="mc4-btn-primary rounded-2xl px-4 py-2 text-sm font-semibold">
                {isPendingUpdate ? "Salvando..." : "Salvar alterações"}
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className="rounded-2xl border border-[var(--panel-border)] px-4 py-2 text-sm text-[var(--text-muted)]">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setIsEditing(true)} className="mc4-badge rounded-full border border-[#EB5727]/20 bg-[#EB5727]/10 px-4 py-2 text-[var(--foreground)]">
            Editar
          </button>
          <button type="button" onClick={() => setShowDeleteConfirm(true)} className="mc4-badge mc4-badge-orange rounded-full px-4 py-2">
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