"use client";

import { useRef, useState } from "react";
import type { deleteCliente, updateCliente } from "@/lib/supabase/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

type ClienteRow = {
  id: string;
  nome: string | null;
};

type ClienteRowEditorProps = {
  cliente: ClienteRow;
  updateAction: typeof updateCliente;
  deleteAction: typeof deleteCliente;
};

export function ClienteRowEditor({ cliente, updateAction, deleteAction }: ClienteRowEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  return (
    <>
      {isEditing ? (
        <tr>
          <td colSpan={2} className="px-4 py-4">
            <div className="rounded-[1.5rem] border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Editar cliente</p>
                <button type="button" onClick={() => setIsEditing(false)} className="rounded-full border border-[var(--panel-border)] px-3 py-1 text-sm text-[var(--text-muted)]">
                  Fechar
                </button>
              </div>
              <form action={updateAction} className="flex flex-col gap-3 sm:flex-row">
                <input type="hidden" name="id" value={cliente.id} />
                <input name="nome" defaultValue={cliente.nome ?? ""} placeholder="Nome do cliente" className="mc4-form-input flex-1 rounded-2xl px-4 py-3 text-sm" required />
                <div className="flex gap-2">
                  <button type="submit" className="mc4-btn-primary rounded-2xl px-4 py-2 text-sm font-semibold">
                    Salvar
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} className="rounded-2xl border border-[var(--panel-border)] px-4 py-2 text-sm text-[var(--text-muted)]">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </td>
        </tr>
      ) : (
        <tr>
          <td className="px-4 py-3 font-medium text-[var(--foreground)]">{cliente.nome}</td>
          <td className="px-4 py-3 text-right">
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsEditing(true)} className="mc4-badge rounded-full border border-[#EB5727]/20 bg-[#EB5727]/10 px-4 py-2 text-[var(--foreground)]">
                Editar
              </button>
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="mc4-badge mc4-badge-orange rounded-full px-4 py-2">
                Excluir
              </button>
            </div>
          </td>
        </tr>
      )}

      <form ref={deleteFormRef} action={deleteAction} className="hidden">
        <input type="hidden" name="id" value={cliente.id} />
      </form>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Excluir cliente"
        description={`Deseja realmente remover o cliente "${cliente.nome ?? ""}"? Itens que já usam esse cliente não serão alterados.`}
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
