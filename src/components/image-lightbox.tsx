"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom"; // Importamos o Portal para renderização na raiz (Body)

type ImageLightboxProps = {
  src: string | null;
  alt: string;
  thumbnailClassName?: string;
  title?: string;
  client?: string;
  category?: string;
};

export function ImageLightbox({
  src,
  alt,
  thumbnailClassName = "h-12 w-12",
  title,
  client,
  category,
}: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // Gerencia a montagem suave das animações CSS
  const [isClient, setIsClient] = useState(false);   // Previne inconsistências de hidratação no Next.js (SSR)

  // Sinaliza que o componente já está montado no navegador
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Monitora interações de teclado (ESC) e transição de opacidade
  useEffect(() => {
    if (!isOpen) {
      setIsMounted(false);
      return;
    }

    // Timer de 10ms para permitir que o navegador registre a renderização antes de animar
    const timer = setTimeout(() => setIsMounted(true), 10);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsMounted(false);
    // Aguarda a animação de saída de 200ms concluir para desmontar o portal do DOM
    setTimeout(() => setIsOpen(false), 200);
  };

  if (!src) {
    return (
      <div 
        className="h-12 w-12 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-border)]/10" 
        aria-hidden="true" 
      />
    );
  }

  return (
    <>
      {/* Botão de Miniatura (Thumbnail) na Tabela */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`group overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[#f4f7f9] focus:outline-none focus:ring-2 focus:ring-[#EB5727] transition-all duration-200 active:scale-95 ${thumbnailClassName}`}
        aria-label={`Ampliar foto de ${alt}`}
      >
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
        />
      </button>

      {/* PORTAL: Renderiza o modal fora do escopo do sidebar/aside, injetando-o diretamente na raiz do body */}
      {isOpen && isClient && typeof document !== "undefined"
        ? createPortal(
            <div
              className={`fixed inset-0 z- flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md transition-opacity duration-200 ease-out ${
                isMounted ? "opacity-100" : "opacity-0"
              }`}
              role="dialog"
              aria-modal="true"
              aria-label={`Foto ampliada de ${alt}`}
              onClick={handleClose}
            >
              {/* Card Central com Transição Suave de Zoom (Scale) e Esvanecimento (Fade) */}
              <div
                className={`relative flex flex-col items-center max-w-[min(90vw,850px)] transition-all duration-300 ease-out transform ${
                  isMounted ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
                }`}
                onClick={(event) => event.stopPropagation()}
              >
                {/* Botão de Fechar Superior */}
                <button
                  type="button"
                  onClick={handleClose}
                  className="absolute -right-4 -top-12 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-900/60 text-lg text-white shadow-xl backdrop-blur-md transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#EB5727]"
                  aria-label="Fechar foto ampliada"
                >
                  ×
                </button>

                {/* Container Físico da Imagem */}
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/20 shadow-2xl">
                  <img
                    src={src}
                    alt={alt}
                    className="max-h-[70vh] w-full object-contain"
                  />
                </div>

                {/* Seção Sutil de Legendas e Categorização */}
                <div className="mt-4 text-center w-full">
                  <h4 className="text-base font-semibold text-white tracking-wide">
                    {title || alt}
                  </h4>
                  {(client || category) && (
                    <div className="mt-2.5 flex items-center justify-center gap-2 text-xs font-medium">
                      {client && (
                        <span className="bg-white/5 text-slate-300 px-3 py-1 rounded-full border border-white/5">
                          {client}
                        </span>
                      )}
                      {category && (
                        <span className="bg-[#EB5727]/10 text-[#ff7c4a] px-3 py-1 rounded-full border border-[#EB5727]/10">
                          {category}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body // Alvo do Portal na raiz da aplicação
          )
        : null}
    </>
  );
}