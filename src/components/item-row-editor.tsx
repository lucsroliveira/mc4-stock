"use client";

import { useRef, useState } from "react";
import type { deleteItem, updateItem } from "@/lib/supabase/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

type ItemRow = {
  id: string;
  nome: string | null;
  categoria: string | null;
  cliente: string | null;
  descricao: string | null;
  foto_url: string | null;
};

type ItemRowEditorProps = {
  item: ItemRow;
  updateAction: typeof updateItem;
  deleteAction: typeof deleteItem;
};

export function ItemRowEditor({ item, updateAction, deleteAction }: ItemRowEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  return (
    <>
      {isEditing ? (
        <tr key={item.id}>
          <td colSpan={5} className="px-4 py-4">
            <div className="rounded-[1.5rem] border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Editar item</p>
                  <h4 className="mt-1 text-lg font-semibold text-[var(--foreground)]">{item.nome ?? "Item"}</h4>
                </div>
                <button type="button" onClick={() => setIsEditing(false)} className="rounded-full border border-[var(--panel-border)] px-3 py-1 text-sm text-[var(--text-muted)]">
                  Fechar
                </button>
              </div>
              <form action={updateAction} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="id" value={item.id} />
                <input name="nome" defaultValue={item.nome ?? ""} placeholder="Nome do item" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" required />
                <select name="categoria" defaultValue={item.categoria ?? "Cenografia"} className="mc4-form-select rounded-2xl px-4 py-3 text-sm">
                  <option value="Cenografia">Cenografia</option>
                  <option value="Vestuario">Vestuário</option>
                  <option value="Brindes">Brindes</option>
                  <option value="OOH">OOH</option>
                  <option value="Ativação">Ativação</option>
                </select>
                <select name="cliente" defaultValue={item.cliente ?? "Interno / MC4"} className="mc4-form-select rounded-2xl px-4 py-3 text-sm">
                  <option value="Interno / MC4">Interno / MC4</option>
                  <option value="Esportes da Sorte">Esportes da Sorte</option>
                  <option value="Boticário">Boticário</option>
                  <option value="MOOD">MOOD</option>
                  <option value="Cenoura e Bronze">Cenoura e Bronze</option>
                </select>
                <input name="foto_url" defaultValue={item.foto_url ?? ""} placeholder="URL da foto" className="mc4-form-input rounded-2xl px-4 py-3 text-sm md:col-span-2" />
                <textarea name="descricao" defaultValue={item.descricao ?? ""} rows={3} placeholder="Descrição completa" className="mc4-form-textarea rounded-2xl px-4 py-3 text-sm md:col-span-2" />
                <div className="flex gap-2 md:col-span-2">
                  <button type="submit" className="mc4-btn-primary rounded-2xl px-4 py-2 text-sm font-semibold">
                    Salvar alterações
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
        <tr key={item.id}>
          <td className="px-4 py-3 font-medium text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-xl border border-[#416ba9]/10 bg-[#f4f7f9]">
                {item.foto_url ? <img src={item.foto_url} alt={item.nome ?? "Item"} className="h-full w-full object-cover" /> : null}
              </div>
              <span>{item.nome}</span>
            </div>
          </td>
          <td className="px-4 py-3 text-slate-300">{item.categoria}</td>
          <td className="px-4 py-3 text-slate-300">{item.cliente}</td>
          <td className="px-4 py-3 text-slate-300">{item.descricao ?? "-"}</td>
          <td className="px-4 py-3 text-right">
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsEditing(true)} className="mc4-badge rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[var(--foreground)]">
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
        <input type="hidden" name="id" value={item.id} />
      </form>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Excluir item"
        description={`Deseja realmente remover ${item.nome ?? "este item"} do catálogo?`}
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
