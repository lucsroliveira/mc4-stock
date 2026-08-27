"use client";

import { useEffect, useState } from "react";

type ImageLightboxProps = {
  src: string | null;
  alt: string;
  thumbnailClassName?: string;
};

export function ImageLightbox({ src, alt, thumbnailClassName = "h-12 w-12" }: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  if (!src) {
    return <div className="h-12 w-12 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-border)]/10" aria-hidden="true" />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`group overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[#f4f7f9] focus:outline-none focus:ring-2 focus:ring-[#EB5727] ${thumbnailClassName}`}
        aria-label={`Ampliar foto de ${alt}`}
      >
        <img src={src} alt={alt} className="h-full w-full object-cover transition duration-200 group-hover:scale-110" />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ampliada de ${alt}`}
          onClick={() => setIsOpen(false)}
        >
          <div className="relative max-h-[90vh] max-w-[min(92vw,900px)]" onClick={(event) => event.stopPropagation()}>
            <img src={src} alt={alt} className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl" />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-[var(--panel)] text-lg text-[var(--foreground)] shadow-lg"
              aria-label="Fechar foto ampliada"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
