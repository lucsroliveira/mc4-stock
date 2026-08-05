"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const storedTheme = window.localStorage.getItem("mc4-theme");
    return storedTheme === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem("mc4-theme", nextTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Alternar para modo ${theme === "light" ? "escuro" : "claro"}`}
      className="flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel)] px-2 py-2 shadow-sm"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
        {theme === "light" ? "Claro" : "Escuro"}
      </span>
      <span className="relative flex h-6 w-11 items-center rounded-full bg-[#416ba9]/15 p-1">
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full bg-[#00a5b5] text-[10px] transition-transform ${theme === "light" ? "translate-x-0" : "translate-x-5"}`}
        >
          {theme === "light" ? "☀️" : "🌙"}
        </span>
      </span>
    </button>
  );
}
