import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/supabase/auth-guard";

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function csvEscape(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function normalizeSearch(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export async function GET(request: Request) {
  const userRole = await getCurrentUserRole();
  if (userRole === "cliente") {
    return NextResponse.json({ error: "Acesso negado para exportação." }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedEstoqueId = url.searchParams.get("estoqueId") ?? "";
  const searchTerm = normalizeSearch(url.searchParams.get("q"));
  const supabase = await createSupabaseServerClient();

  const { data: estoques } = await supabase.from("estoques").select("id, nome").order("nome", { ascending: true });
  const estoqueRows = (estoques ?? []) as Array<{ id: string; nome: string | null }>;
  const recifeEstoque = estoqueRows.find((estoque) => normalizeText(estoque.nome) === "recife");
  const selectedEstoqueId = requestedEstoqueId || recifeEstoque?.id || estoqueRows[0]?.id || "";

  const { data: inventario } = await supabase
    .from("estoque_itens")
    .select("quantidade, itens ( nome, categoria, cliente, foto_url )")
    .eq("estoque_id", selectedEstoqueId);

  const rows = (inventario ?? []) as Array<{
    quantidade: number;
    itens:
      | { nome: string | null; categoria: string | null; cliente: string | null; foto_url: string | null }
      | { nome: string | null; categoria: string | null; cliente: string | null; foto_url: string | null }[]
      | null;
  }>;

  const filteredRows = rows.filter((row) => {
    if (!searchTerm) return true;
    const item = Array.isArray(row.itens) ? row.itens[0] : row.itens;
    const haystack = `${item?.nome ?? ""} ${item?.cliente ?? ""} ${item?.categoria ?? ""}`.toLowerCase();
    return haystack.includes(searchTerm);
  });

  const header = ["item", "cliente", "categoria", "quantidade"];
  const csvLines = [header.map(csvEscape).join(",")];

  filteredRows.forEach((row) => {
    const item = Array.isArray(row.itens) ? row.itens[0] : row.itens;
    csvLines.push([
      item?.nome ?? "Item excluído",
      item?.cliente ?? "-",
      item?.categoria ?? "-",
      row.quantidade,
    ].map(csvEscape).join(","));
  });

  const csv = `\ufeff${csvLines.join("\r\n")}`;
  const fileName = `inventario${selectedEstoqueId ? `-${selectedEstoqueId}` : ""}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}