"use client";

import { useEffect, useState } from "react";

type ToastNotificationProps = {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
};

export function ToastNotification({ message, type = "success", onClose }: ToastNotificationProps) {
  const [animationClass, setAnimationClass] = useState("translate-y-10 opacity-0");

  useEffect(() => {
    // Animação de entrada
    const enterTimer = setTimeout(() => setAnimationClass("translate-y-0 opacity-100"), 50);
    
    // Auto-destruição após 3.5 segundos
    const closeTimer = setTimeout(() => {
      setAnimationClass("translate-y-10 opacity-0");
      setTimeout(onClose, 300); // Aguarda a animação de saída terminar
    }, 3500);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  const styles = {
    success: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      icon: "✓",
      iconBg: "bg-emerald-500"
    },
    error: {
      border: "border-rose-500/30",
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      icon: "✕",
      iconBg: "bg-rose-500"
    },
    info: {
      border: "border-cyan-500/30",
      bg: "bg-cyan-500/10",
      text: "text-cyan-400",
      icon: "i",
      iconBg: "bg-cyan-500"
    }
  }[type];

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border ${styles.border} ${styles.bg} p-4 shadow-2xl backdrop-blur-md transition-all duration-300 transform ${animationClass}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.iconBg} text-xs font-bold text-white`}>
        {styles.icon}
      </div>
      <div className="min-w-[200px]">
        <p className={`text-xs font-bold uppercase tracking-wider ${styles.text}`}>
          {type === "success" ? "Concluído" : type === "error" ? "Erro" : "Informação"}
        </p>
        <p className="text-sm text-[var(--foreground)] mt-0.5">{message}</p>
      </div>
      <button 
        type="button" 
        onClick={() => {
          setAnimationClass("translate-y-10 opacity-0");
          setTimeout(onClose, 300);
        }}
        className="ml-2 text-lg text-[var(--text-muted)] hover:text-[var(--foreground)]"
      >
        ×
      </button>
    </div>
  );
}