import { NextRequest, NextResponse } from "next/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type NamedRelation = { nome: string | null } | { nome: string | null }[] | null;

type MovementRow = {
  id: string;
  data_movimentacao: string;
  tipo: string;
  quantidade: number;
  observacao: string | null;
  criado_por: string | null;
  itens: NamedRelation;
  origem: NamedRelation;
  destino: NamedRelation;
};

const TIPO_LABELS: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  transferencia: "Transferência",
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function relationName(relation: NamedRelation) {
  const value = Array.isArray(relation) ? relation[0] : relation;
  return value?.nome ?? null;
}

function formatDateBr(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);

  const inicio = searchParams.get("inicio")?.trim() || null;
  const fim = searchParams.get("fim")?.trim() || null;
  const tipo = searchParams.get("tipo")?.trim() || null;
  const searchTerm = searchParams.get("q")?.trim() || null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Não autorizado", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "cliente") {
    return new NextResponse("Acesso negado para exportação.", { status: 403 });
  }

  const { data: movimentos, error } = await supabase
    .from("movimentacoes")
    .select(
      "id, data_movimentacao, tipo, quantidade, observacao, criado_por, itens ( nome ), origem:estoques!origem_id ( nome ), destino:estoques!destino_id ( nome )",
    )
    .order("data_movimentacao", { ascending: false });

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  const search = normalizeText(searchTerm);
  const startTime = inicio ? new Date(`${inicio}T00:00:00.000Z`).getTime() : null;
  const endTime = fim ? new Date(`${fim}T23:59:59.999Z`).getTime() : null;

  const rows = ((movimentos ?? []) as unknown as MovementRow[]).filter((row) => {
    const movementTime = new Date(row.data_movimentacao).getTime();

    if (startTime !== null && movementTime < startTime) return false;
    if (endTime !== null && movementTime > endTime) return false;
    if (tipo && tipo !== "todos" && row.tipo !== tipo) return false;
    if (!search) return true;

    return [
      relationName(row.itens),
      relationName(row.origem),
      relationName(row.destino),
      row.observacao,
      row.criado_por,
    ].some((value) => normalizeText(value).includes(search));
  });

  const doc = new jsPDF();
  const dataEmissao = new Date().toLocaleString("pt-BR");

  doc.setFillColor(0, 165, 181);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("MC4 - GESTÃO DE ESTOQUE", 15, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("RELATÓRIO DE MOVIMENTAÇÕES E AUDITORIA", 15, 26);

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.text(`Emitido por: ${profile?.full_name ?? user.email}`, 15, 40);
  doc.text(`Data de Emissão: ${dataEmissao}`, 15, 46);

  const filtrosAtivos: string[] = [];
  if (inicio) filtrosAtivos.push(`Início: ${formatDateBr(inicio)}`);
  if (fim) filtrosAtivos.push(`Fim: ${formatDateBr(fim)}`);
  filtrosAtivos.push(
    `Tipo: ${tipo && tipo !== "todos" ? (TIPO_LABELS[tipo] ?? tipo) : "Todos"}`,
  );
  if (searchTerm) filtrosAtivos.push(`Busca: "${searchTerm}"`);

  doc.setFont("helvetica", "bold");
  const filtrosLines = doc.splitTextToSize(`Filtros: ${filtrosAtivos.join(" | ")}`, 180) as string[];
  doc.text(filtrosLines, 15, 52);

  const startY = 52 + filtrosLines.length * 4.5 + 2;

  const tableRows = rows.map((row) => {
    const sinal = row.tipo === "saida" ? "-" : "+";
    return [
      new Date(row.data_movimentacao).toLocaleDateString("pt-BR"),
      relationName(row.itens) ?? "Item excluído",
      TIPO_LABELS[row.tipo] ?? row.tipo,
      relationName(row.origem) ?? "Externo",
      relationName(row.destino) ?? "Baixa",
      `${sinal}${Number(row.quantidade ?? 0).toLocaleString("pt-BR")}`,
      row.criado_por ?? "-",
      row.observacao?.trim() || "-",
    ];
  });

  autoTable(doc, {
    startY,
    head: [["Data", "Item", "Tipo", "Origem", "Destino", "Qtd", "Operador", "Observação"]],
    body: tableRows,
    headStyles: {
      fillColor: [0, 165, 181],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 30, fontStyle: "bold" },
      2: { cellWidth: 22 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 14, halign: "right" },
      6: { cellWidth: 22 },
      7: { cellWidth: 28 },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    theme: "grid",
    margin: { left: 15, right: 15 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        const text = String(data.cell.raw ?? "");
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = text.startsWith("-") ? [225, 29, 72] : [22, 130, 70];
      }
    },
  });

  const totalUnidades = rows.reduce((acc, row) => acc + Number(row.quantidade ?? 0), 0);
  const lastY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  let finalY = lastY ? lastY + 10 : 200;

  if (finalY > 280) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 32, 51);
  doc.text(
    `Total de Registros: ${rows.length} movimentação(ões)  |  Volume Total: ${totalUnidades.toLocaleString("pt-BR")} unidade(s)`,
    15,
    finalY,
  );

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("Este documento é um registro oficial de auditoria do MC4 Stock.", 105, 290, { align: "center" });
  }

  const pdfBuffer = doc.output("arraybuffer");
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Relatorio_Movimentacoes.pdf"',
    },
  });
}
