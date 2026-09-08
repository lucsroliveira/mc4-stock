"use client";

import { useState, useRef, useEffect } from "react";

type Option = {
  id: string;
  nome: string | null;
  fotoPreviewUrl?: string | null; // Suporte opcional para fotos (exclusivo para itens)
};

type SearchableSelectProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showImages?: boolean; // Ativa/desativa a renderização de miniaturas (thumbnails)
  disabled?: boolean; // Ativa/desativa o campo inteiro
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  showImages = false, // Por padrão, não exibe imagens (ótimo para Categoria, Cliente, Estoques)
  disabled = false, // Por padrão, o campo está ativo
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Se o valor for vazio, trata como não selecionado para exibir o placeholder
  const selectedOption = value !== "" ? options.find((opt) => opt.id === value) : undefined;

  // Normaliza o texto para remover acentos e facilitar buscas
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filteredOptions = options.filter((opt) =>
    normalize(opt.nome ?? "").includes(normalize(searchTerm))
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  const isFilled = !!selectedOption;
  const borderStyle = isOpen
    ? "border-[#EB5727] ring-2 ring-[#EB5727]/20"
    : isFilled
    ? "border-[#EB5727]/50 bg-[#EB5727]/[0.02]"
    : "border-[var(--input-border)]";

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Botão de Gatilho do Dropdown */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`mc4-form-select flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm text-left shadow-sm transition-all duration-200 ${
          disabled
            ? "cursor-not-allowed opacity-50 bg-[var(--panel-border)]/40 border-[var(--panel-border)]"
            : borderStyle
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Só renderiza a miniatura se showImages for true e houver item selecionado */}
          {showImages && selectedOption && (
            <div className="h-6 w-6 shrink-0 overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[#f4f7f9]">
              {selectedOption.fotoPreviewUrl ? (
                <img src={selectedOption.fotoPreviewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[8px] text-slate-400">
                  N/A
                </div>
              )}
            </div>
          )}
          <span className={`truncate ${selectedOption ? "text-[var(--foreground)]" : "text-[var(--text-muted)]"}`}>
            {selectedOption ? selectedOption.nome : placeholder}
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Caixa Suspensa */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-xl backdrop-blur-md">
          <div className="border-b border-[var(--panel-border)] p-2 bg-[var(--panel-border)]/10">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite para buscar..."
              className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[#EB5727] placeholder-[var(--text-muted)]"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          <ul className="max-h-44 overflow-y-auto py-1 text-sm scrollbar-thin">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center px-4 py-2.5 text-left transition-colors hover:bg-[#EB5727]/10 hover:text-[var(--foreground)] ${
                      opt.id === value ? "bg-[#EB5727]/15 font-semibold text-[#EB5727]" : "text-[var(--foreground)]"
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {/* Só exibe a imagem na lista se showImages for true */}
                      {showImages && (
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[#f4f7f9]">
                          {opt.fotoPreviewUrl ? (
                            <img src={opt.fotoPreviewUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                              N/A
                            </div>
                          )}
                        </div>
                      )}
                      <span className="truncate">{opt.nome}</span>
                    </div>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-center text-xs italic text-[var(--text-muted)]">
                Nenhum resultado encontrado
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}