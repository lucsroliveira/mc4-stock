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

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\r?\n/g, " ");
}

function truncateText(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function buildPdf(lines: string[]) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;
  const fontSize = 10;
  const lineHeight = 14;
  const linesPerPage = 48;
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / linesPerPage)) }, (_, index) =>
    lines.slice(index * linesPerPage, (index + 1) * linesPerPage),
  );

  const objectCount = 3 + pages.length * 2;
  const objects: string[] = new Array(objectCount + 1);
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;

  pages.forEach((pageLines, index) => {
    const pageObjectId = 4 + index * 2;
    const contentObjectId = 5 + index * 2;
    const contentBody = pageLines
      .map((line, lineIndex) => {
        const text = escapePdfText(truncateText(line, 110));
        if (lineIndex === 0) {
          const y = pageHeight - margin - 20;
          return `BT /F1 ${fontSize} Tf ${margin} ${y} Td (${text}) Tj`;
        }
        return `0 -${lineHeight} Td (${text}) Tj`;
      })
      .join("\n") + "\nET";

    objects[pageObjectId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId] = `<< /Length ${Buffer.byteLength(contentBody, "latin1")} >>\nstream\n${contentBody}\nendstream`;
  });

  let output = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
  const offsets: number[] = new Array(objectCount + 1).fill(0);

  for (let index = 1; index <= objectCount; index += 1) {
    offsets[index] = Buffer.byteLength(output, "latin1");
    output += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const startXref = Buffer.byteLength(output, "latin1");
  output += `xref\n0 ${objectCount + 1}\n`;
  output += `0000000000 65535 f \n`;

  for (let index = 1; index <= objectCount; index += 1) {
    output += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }

  output += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
  return Buffer.from(output, "latin1");
}

export async function GET(request: Request) {
  const userRole = await getCurrentUserRole();
  if (userRole === "cliente") {
    return NextResponse.json({ error: "Acesso negado para exportação." }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedEstoqueId = url.searchParams.get("estoqueId") ?? "";
  const searchTerm = normalizeText(url.searchParams.get("q"));
  const supabase = await createSupabaseServerClient();

  const { data: estoques } = await supabase.from("estoques").select("id, nome").order("nome", { ascending: true });
  const estoqueRows = (estoques ?? []) as Array<{ id: string; nome: string | null }>;
  const recifeEstoque = estoqueRows.find((estoque) => normalizeText(estoque.nome) === "recife");
  const selectedEstoqueId = requestedEstoqueId || recifeEstoque?.id || estoqueRows[0]?.id || "";
  const selectedEstoqueNome = estoqueRows.find((estoque) => estoque.id === selectedEstoqueId)?.nome ?? recifeEstoque?.nome ?? "Inventário";

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

  const lines = [
    `Inventario - ${selectedEstoqueNome}`,
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    "",
    "Item | Cliente | Categoria | Quantidade",
    ...filteredRows.map((row) => {
      const item = Array.isArray(row.itens) ? row.itens[0] : row.itens;
      return `${item?.nome ?? "Item excluido"} | ${item?.cliente ?? "-"} | ${item?.categoria ?? "-"} | ${row.quantidade}`;
    }),
  ];

  const pdfBuffer = buildPdf(lines);
  const fileName = `inventario${selectedEstoqueId ? `-${selectedEstoqueId}` : ""}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}