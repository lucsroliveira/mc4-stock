"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-[var(--panel)] p-6 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-[#EB5727]">Confirmação</p>
        <h3 className="mt-3 text-xl font-semibold text-[var(--foreground)]">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-2xl border border-[var(--panel-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)]">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className="rounded-2xl bg-[#eb5727] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#eb5727]/20">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
