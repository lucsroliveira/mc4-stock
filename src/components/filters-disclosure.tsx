"use client";

import { useState, type ReactNode } from "react";

type FiltersDisclosureProps = {
  activeCount?: number;
  children: ReactNode;
};

export function FiltersDisclosure({ activeCount = 0, children }: FiltersDisclosureProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-5">
      <button
        type="button"
        className="filters-toggle"
        aria-expanded={open}
        aria-controls="consulta-filtros"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex items-center gap-2">
          Filtros
          {activeCount > 0 && <span className="filters-toggle-badge">{activeCount}</span>}
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div id="consulta-filtros" className="filters-body" data-open={open}>
        {children}
      </div>
    </div>
  );
}
