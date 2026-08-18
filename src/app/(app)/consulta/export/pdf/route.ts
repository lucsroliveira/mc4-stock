import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "jspdf-autotable";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  
  const estoqueId = searchParams.get("estoqueId");
  const searchTerm = searchParams.get("q")?.trim();

  // 1. VERIFICAÇÃO DE PERMISSÕES
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Não autorizado", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "cliente") {
    return new NextResponse("Clientes não possuem permissão para exportar.", { status: 403 });
  }

  // 2. BUSCA DE DADOS (Correção: Adição de aspas no select)
  let query = supabase
    .from("estoque_itens")
    .select("quantidade, itens!inner(nome, cliente, ativo), estoques(nome)")
    .eq("itens.ativo", true);

  if (estoqueId) query = query.eq("estoque_id", estoqueId);

  const { data: inventoryData } = await query;
  const rows = inventoryData ?? [];

  // Filtragem por termo de busca
  const filteredRows = rows.filter((row: any) => {
    if (!searchTerm) return true;
    const item = row.itens;
    const haystack = `${item?.nome ?? ""} ${item?.cliente ?? ""}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  // 3. GERAÇÃO DO PDF
  const doc = new jsPDF();
  const dataEmissao = new Date().toLocaleString("pt-BR");
  const estoqueNome = rows[0]?.estoques?.[0]?.nome ?? "Geral";
  // Cabeçalho MC4
  doc.setFillColor(0, 165, 181); 
  doc.rect(0, 0, 210, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("MC4 - GESTÃO DE ESTOQUE", 15, 22);

  // Auditoria
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Emitido por: ${profile?.full_name ?? user.email}`, 15, 45);
  doc.text(`Data de Emissão: ${dataEmissao}`, 15, 50);
  doc.text(`Local: ${estoqueNome}`, 15, 55);

  const tableColumn = ["Nome do Item", "Cliente", "Quantidade"];
  const tableRows = filteredRows.map((row: any) => [
    row.itens?.nome ?? "Item Indisponível",
    row.itens?.cliente ?? "Geral",
    Number(row.quantidade ?? 0).toLocaleString("pt-BR")
  ]);

  autoTable(doc, {
    startY: 65,
    head: [tableColumn],
    body: tableRows,
    headStyles: { 
      fillColor: [0, 165, 181],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold"
    },
    styles: { fontSize: 9, cellPadding: 4 },
    alternateRowStyles: { fillColor: [240, 248, 250] },
    theme: "grid",
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Este documento é um espelho oficial do inventário MC4 Stock.", 105, 285, { align: "center" });

  const pdfBuffer = doc.output("arraybuffer");
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Inventario_${estoqueNome.replace(/\s+/g, "_")}.pdf"`,
    },
  });
}