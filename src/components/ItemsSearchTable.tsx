"use client";

import { useState } from "react";
import { ItemRowEditor } from "@/components/item-row-editor";

type ItemRow = {
  id: string;
  nome: string | null;
  categoria: string | null;
  cliente: string | null;
  descricao: string | null;
  foto_url: string | null;
  foto_preview_url: string | null;
  created_at: string | null;
};

type ItemsSearchTableProps = {
  initialItems: ItemRow[];
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
};

const ITEMS_PER_PAGE = 10;

export default function ItemsSearchTable({ initialItems, updateAction, deleteAction }: ItemsSearchTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filtra os itens com base na busca (nome, categoria, cliente ou descrição)
  const filteredItems = initialItems.filter((item) => {
    const search = searchTerm.toLowerCase();
    return (
      (item.nome?.toLowerCase() ?? "").includes(search) ||
      (item.categoria?.toLowerCase() ?? "").includes(search) ||
      (item.cliente?.toLowerCase() ?? "").includes(search) ||
      (item.descricao?.toLowerCase() ?? "").includes(search)
    );
  });

  // Paginação
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reseta para a primeira página ao buscar
  };

  return (
    <div className="space-y-4">
      {/* Barra de Busca */}
      <div>
        <input
          type="text"
          placeholder="Buscar por nome, categoria, cliente ou descrição..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--text-muted)] focus:border-[#00a5b5] focus:outline-none"
        />
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)]">
        <table className="min-w-full divide-y divide-[var(--panel-border)] text-sm">
          <thead className="bg-[var(--panel-border)]/20 text-[var(--foreground)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Item</th>
              <th className="px-4 py-3 text-left font-medium">Categoria</th>
              <th className="px-4 py-3 text-left font-medium">Cliente</th>
              <th className="px-4 py-3 text-left font-medium">Descrição</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--panel-border)] bg-[var(--panel)]">
            {currentItems.length > 0 ? (
              currentItems.map((item) => (
                <ItemRowEditor
                  key={item.id}
                  item={item}
                  updateAction={updateAction}
                  deleteAction={deleteAction}
                />
              ))
            ) : (
              <tr>
                <td className="px-4 py-5 text-center text-[var(--text-muted)]" colSpan={5}>
                  Nenhum item encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-sm text-[var(--text-muted)]">
          <p>
            Mostrando <span className="font-medium text-[var(--foreground)]">{startIndex + 1}</span> a{" "}
            <span className="font-medium text-[var(--foreground)]">
              {Math.min(startIndex + ITEMS_PER_PAGE, filteredItems.length)}
            </span>{" "}
            de <span className="font-medium text-[var(--foreground)]">{filteredItems.length}</span> registros
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-1.5 font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--panel-border)]/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>

            <span className="px-2">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-1.5 font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--panel-border)]/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}