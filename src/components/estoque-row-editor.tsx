"use client";

import { useRef, useState } from "react";
import type { deleteEstoque, updateEstoque } from "@/lib/supabase/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

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

  return (
    <>
      {isEditing ? (
        <div className="rounded-[1.5rem] border border-cyan-400/20 bg-[rgba(7,17,31,0.82)] p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#00a5b5]">Editar local</p>
              <h4 className="mt-1 text-lg font-semibold text-white">{estoque.nome ?? "Local"}</h4>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300">
              Fechar
            </button>
          </div>
          <form action={updateAction} className="grid gap-3 md:grid-cols-2">
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
              <button type="submit" className="mc4-btn-primary rounded-2xl px-4 py-2 text-sm font-semibold">
                Salvar alterações
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-300">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setIsEditing(true)} className="mc4-badge rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[var(--foreground)]">
            Editar
          </button>
          <button type="button" onClick={() => setShowDeleteConfirm(true)} className="mc4-badge mc4-badge-orange rounded-full px-4 py-2">
            Excluir
          </button>
        </div>
      )}

      <form ref={deleteFormRef} action={deleteAction} className="hidden">
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
