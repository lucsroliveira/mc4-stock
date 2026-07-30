"use client";

import { useState, ReactNode } from "react";

type Column<T> = {
  header: string;
  accessorKey: keyof T | string;
  className?: string;
};

type DataTableSearchProps<T> = {
  data: T[];
  searchKeys: (keyof T)[];
  placeholder?: string;
  columns: Column<T>[];
  itemsPerPage?: number;
};

export default function DataTableSearch<T>({
  data,
  searchKeys,
  placeholder = "Buscar...",
  columns,
  itemsPerPage = 10,
}: DataTableSearchProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return searchKeys.some((key) => {
      const value = item[key];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(search);
    });
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      <div>
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--text-muted)] focus:border-[#00a5b5] focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)]">
        <table className="min-w-full divide-y divide-[var(--panel-border)] text-sm">
          <thead className="bg-[var(--panel-border)]/20 text-[var(--foreground)]">
            <tr>
              {columns.map((col, index) => (
                <th key={index} className={`px-4 py-3 font-medium ${col.className ?? "text-left"}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--panel-border)] bg-[var(--panel)]">
            {currentData.length > 0 ? (
              currentData.map((item, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-[var(--panel-border)]/10 transition-colors">
                  {columns.map((col, colIndex) => {
                    const value = item[col.accessorKey as keyof T];

                    // Renderização especial baseada na coluna "tipo" para exibir o Badge colorido
                    if (String(col.accessorKey) === "tipo") {
                      const tipoStr = String(value);
                      const badgeClass =
                        tipoStr === "entrada"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-200"
                          : tipoStr === "saida"
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-200"
                            : "bg-cyan-500/15 text-cyan-600 dark:text-cyan-200";

                      return (
                        <td key={colIndex} className={`px-4 py-3 ${col.className ?? "text-left"}`}>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${badgeClass}`}>
                            {tipoStr}
                          </span>
                        </td>
                      );
                    }

                    return (
                      <td key={colIndex} className={`px-4 py-3 text-[var(--foreground)] ${col.className ?? "text-left"}`}>
                        {value as ReactNode}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-5 text-center text-[var(--text-muted)]" colSpan={columns.length}>
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-sm text-[var(--text-muted)]">
          <p>
            Mostrando <span className="font-medium text-[var(--foreground)]">{startIndex + 1}</span> a{" "}
            <span className="font-medium text-[var(--foreground)]">
              {Math.min(startIndex + itemsPerPage, filteredData.length)}
            </span>{" "}
            de <span className="font-medium text-[var(--foreground)]">{filteredData.length}</span> registros
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