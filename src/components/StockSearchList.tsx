"use client";

import Link from "next/link";
import { useState } from "react";
import { ImageLightbox } from "@/components/image-lightbox";

type StockRow = {
  id: string;
  nome: string;
  total: number;
  cliente: string;
  fotoPreviewUrl: string | null;
};

export default function StockSearchList({ initialRows }: { initialRows: StockRow[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRows = initialRows.filter((item) =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Campo de Busca */}
      <div>
        <input
          type="text"
          placeholder="Buscar item pelo nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--text-muted)] focus:border-[#EB5727] focus:outline-none"
        />
      </div>

      {/* Lista de Saldos com scroll inteligente */}
      <div 
        className="space-y-3 max-h-[350px] overflow-y-auto pr-2 
                   /* Oculta a barra de rolagem por padrão em navegadores Webkit (Chrome, Safari, Edge) */
                   [&::-webkit-scrollbar]:w-1.5
                   [&::-webkit-scrollbar-track]:bg-transparent
                   [&::-webkit-scrollbar-thumb]:bg-transparent
                   hover:[&::-webkit-scrollbar-thumb]:bg-[var(--panel-border)]
                   [&::-webkit-scrollbar-thumb]:rounded-full
                   /* Para Firefox */
                   scrollbar-width: thin;
                   scrollbar-color: transparent transparent;
                   hover:scrollbar-color: var(--panel-border) transparent;
                   transition: scrollbar-color 0.2s;"
      >
        {filteredRows.length > 0 ? (
          filteredRows.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 transition-colors hover:border-[#EB5727]/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <ImageLightbox src={item.fotoPreviewUrl} alt={item.nome} />
                <Link href={`/itens/${item.id}`} className="min-w-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EB5727]">
                  <p className="truncate font-medium text-[var(--foreground)]">{item.nome}</p>
                  <p className="text-xs text-[var(--text-muted)]">{item.cliente}</p>
                </Link>
              </div>
              <span className="mc4-badge mc4-badge-lime">{(item.total ?? 0).toLocaleString('pt-BR')}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">Nenhum item encontrado.</p>
        )}
      </div>
    </div>
  );
}