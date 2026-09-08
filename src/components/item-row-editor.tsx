"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import type { deleteItem, updateItem } from "@/lib/supabase/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast-context";
import { SearchableSelect } from "@/components/searchable-select"; // Importação do seletor inteligente

type ItemRow = {
  id: string;
  nome: string | null;
  categoria: string | null;
  cliente: string | null;
  descricao: string | null;
  foto_url: string | null;
  foto_preview_url?: string | null;
};

type ItemRowEditorProps = {
  item: ItemRow;
  updateAction: typeof updateItem;
  deleteAction: typeof deleteItem;
  categoriaOptions: { id: string; nome: string | null }[];
  clienteOptions: { id: string; nome: string | null }[];
};

export function ItemRowEditor({
  item,
  updateAction,
  deleteAction,
  categoriaOptions,
  clienteOptions,
}: ItemRowEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  const { showToast } = useToast();
  const [isPendingUpdate, startUpdateTransition] = useTransition();
  const [isPendingDelete, startDeleteTransition] = useTransition();

  // Estados locais para controlar os seletores customizados na edição inline
  const [categoria, setCategoria] = useState(item.categoria ?? "");
  const [cliente, setCliente] = useState(item.cliente ?? "");

  // Função para lidar com o salvamento da edição inline
  const handleUpdate = (formData: FormData) => {
    startUpdateTransition(async () => {
      try {
        await updateAction(formData);
        showToast("Item atualizado com sucesso!", "success");
        setIsEditing(false);
      } catch (error: any) {
        showToast(error.message || "Erro ao atualizar o item.", "error");
      }
    });
  };

  // Função para lidar com a exclusão do item
  const handleDelete = (formData: FormData) => {
    startDeleteTransition(async () => {
      try {
        await deleteAction(formData);
        showToast("Item removido/inativado com sucesso!", "success");
        setShowDeleteConfirm(false);
      } catch (error: any) {
        showToast(error.message || "Erro ao excluir o item.", "error");
      }
    });
  };

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
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="categoria" value={categoria} />
                <input type="hidden" name="cliente" value={cliente} />

                {/* Nome do Item */}
                <div className="md:col-span-2 grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Nome do Item
                  </label>
                  <input
                    name="nome"
                    defaultValue={item.nome ?? ""}
                    placeholder="Ex: Camisa Polo MC4 - Tamanho M"
                    className="mc4-form-input rounded-2xl px-4 py-3 text-sm"
                    required
                  />
                </div>

                {/* Categoria Inteligente (Sem miniatura de foto) */}
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Categoria
                  </label>
                  <SearchableSelect
                    options={categoriaOptions.map((c) => ({ id: c.nome ?? "", nome: c.nome }))}
                    value={categoria}
                    onChange={setCategoria}
                    placeholder="Buscar ou escolher categoria..."
                    showImages={false} // Mantém o campo textual e limpo
                  />
                </div>

                {/* Cliente Proprietário Inteligente (Sem miniatura de foto) */}
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Cliente Proprietário
                  </label>
                  <SearchableSelect
                    options={clienteOptions.map((cl) => ({ id: cl.nome ?? "", nome: cl.nome }))}
                    value={cliente}
                    onChange={setCliente}
                    placeholder="Buscar ou escolher cliente..."
                    showImages={false} // Mantém o campo textual e limpo
                  />
                </div>

                {/* Imagem do Catálogo */}
                <div className="md:col-span-2 grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Imagem do Catálogo (Selecione um novo arquivo para substituir)
                  </label>
                  <input type="hidden" name="foto_url" value={item.foto_url ?? ""} />
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
                    defaultValue={item.descricao ?? ""}
                    placeholder="Descreva observações, tamanho, cor ou número de série do produto..."
                    rows={3}
                    className="mc4-form-textarea rounded-2xl px-4 py-3 text-sm"
                  />
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2 md:col-span-2 mt-2">
                  <button
                    type="submit"
                    disabled={isPendingUpdate}
                    className="mc4-btn-primary rounded-2xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60"
                  >\
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
          </td>
        </tr>
      ) : (
        <tr key={item.id}>
          <td className="px-4 py-3 font-medium text-white">
            <Link
              href={`/itens/${item.id}`}
              className="group flex items-center gap-3 rounded-xl transition-colors hover:bg-[var(--panel-border)]/15 p-1 -m-1"
            >
              <div className="h-10 w-10 overflow-hidden rounded-xl border border-[#416ba9]/10 bg-[#f4f7f9]">
                {item.foto_preview_url ? (
                  <img src={item.foto_preview_url} alt={item.nome ?? "Item"} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <span className="group-hover:text-[#EB5727]">{item.nome}</span>
            </Link>
          </td>
          <td className="px-4 py-3 text-slate-300">{item.categoria}</td>
          <td className="px-4 py-3 text-slate-300">{item.cliente}</td>
          <td className="px-4 py-3 text-slate-300">{item.descricao ?? "-"}</td>
          <td className="px-4 py-3 text-right">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCategoria(item.categoria ?? "");
                  setCliente(item.cliente ?? "");
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
            <form ref={deleteFormRef} action={handleDelete} className="hidden">
              <input type="hidden" name="id" value={item.id} />
            </form>
          </td>
        </tr>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Excluir item"
        description={`Deseja realmente remover "${item.nome ?? "este item"}" do catálogo?`}
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