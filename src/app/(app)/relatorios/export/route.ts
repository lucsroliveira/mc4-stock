import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/supabase/auth-guard";

type SearchParams = {
  inicio?: string | null;
  fim?: string | null;
  tipo?: string | null;
  q?: string | null;
};

type MovementRow = {
  id: string;
  data_movimentacao: string;
  tipo: string;
  quantidade: number;
  observacao: string | null;
  criado_por: string | null;
  itens: { nome: string | null } | { nome: string | null }[] | null;
  origem: { nome: string | null } | { nome: string | null }[] | null;
  destino: { nome: string | null } | { nome: string | null }[] | null;
};

function csvEscape(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function buildDateRangeParams(searchParams: URLSearchParams) {
  return {
    inicio: searchParams.get("inicio"),
    fim: searchParams.get("fim"),
    tipo: searchParams.get("tipo"),
    q: searchParams.get("q"),
  } satisfies SearchParams;
}

export async function GET(request: Request) {
  const userRole = await getCurrentUserRole();
  if (userRole === "cliente") {
    return NextResponse.json({ error: "Acesso negado para exportação." }, { status: 403 });
  }

  const url = new URL(request.url);
  const { inicio, fim, tipo, q } = buildDateRangeParams(url.searchParams);
  const supabase = await createSupabaseServerClient();

  const { data: movimentos, error } = await supabase
    .from("movimentacoes")
    .select("id, data_movimentacao, tipo, quantidade, observacao, criado_por, itens ( nome ), origem:estoques!origem_id ( nome ), destino:estoques!destino_id ( nome )")
    .order("data_movimentacao", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (movimentos ?? []) as MovementRow[];
  const search = normalizeText(q);

  const filteredRows = rows.filter((row) => {
    const movementTime = new Date(row.data_movimentacao).getTime();

    if (inicio) {
      const startDate = new Date(`${inicio}T00:00:00.000Z`).getTime();
      if (movementTime < startDate) return false;
    }

    if (fim) {
      const endDate = new Date(`${fim}T23:59:59.999Z`).getTime();
      if (movementTime > endDate) return false;
    }

    if (tipo && tipo !== "todos" && row.tipo !== tipo) {
      return false;
    }

    if (!search) {
      return true;
    }

    const item = Array.isArray(row.itens) ? row.itens[0] : row.itens;
    const origem = Array.isArray(row.origem) ? row.origem[0] : row.origem;
    const destino = Array.isArray(row.destino) ? row.destino[0] : row.destino;

    return [
      new Date(row.data_movimentacao).toLocaleString("pt-BR"),
      item?.nome ?? "",
      row.tipo,
      origem?.nome ?? "",
      destino?.nome ?? "",
      row.quantidade,
      row.observacao ?? "",
      row.criado_por ?? "",
    ]
      .map((value) => normalizeText(String(value)))
      .some((value) => value.includes(search));
  });

  const header = ["data", "item", "tipo", "origem", "destino", "quantidade", "observacao", "criado_por"];
  const csvLines = [header.map(csvEscape).join(",")];

  filteredRows.forEach((row) => {
    const item = Array.isArray(row.itens) ? row.itens[0] : row.itens;
    const origem = Array.isArray(row.origem) ? row.origem[0] : row.origem;
    const destino = Array.isArray(row.destino) ? row.destino[0] : row.destino;

    csvLines.push(
      [
        new Date(row.data_movimentacao).toLocaleString("pt-BR"),
        item?.nome ?? "Item excluído",
        row.tipo,
        origem?.nome ?? "Externo",
        destino?.nome ?? "Baixa",
        row.quantidade,
        row.observacao ?? "",
        row.criado_por ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  });

  const csv = `\ufeff${csvLines.join("\r\n")}`;
  const fileNameParts = ["relatorios"];

  if (inicio) fileNameParts.push(inicio);
  if (fim) fileNameParts.push(fim);
  if (tipo && tipo !== "todos") fileNameParts.push(tipo);
  if (q) fileNameParts.push("busca");

  const fileName = `${fileNameParts.join("-")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}