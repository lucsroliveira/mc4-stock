import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MC4 Estoque",
  description: "Sistema de estoque da MC4 com inventário, movimentações e relatórios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(17,24,39,0.92),_rgba(3,7,18,1))] text-slate-100">
        {children}
      </body>
    </html>
  );
}
