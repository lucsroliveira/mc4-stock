import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);

  const estoqueIdParam = searchParams.get("estoqueId");
  const clienteParam = searchParams.get("cliente");
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

  // 2. BUSCA DE DADOS COM SUPORTE A MULTI-TENANCY E MÚLTIPLOS LOCAIS
  let query = supabase
    .from("estoque_itens")
    .select("quantidade, itens!inner(nome, cliente, ativo), estoques(nome)")
    .eq("itens.ativo", true);

  // CORREÇÃO CRÍTICA: Trata múltiplos IDs de estoque (separados por vírgula) usando o operador '.in()'
  if (estoqueIdParam) {
    const ids = estoqueIdParam.split(",").filter(Boolean);
    if (ids.length > 0) {
      query = query.in("estoque_id", ids);
    }
  }

  if (clienteParam) {
    query = query.eq("itens.cliente", clienteParam);
  }

  const { data: inventoryData } = await query;
  const rows = inventoryData ?? [];

  // Filtragem local baseada na busca textual
  const filteredRows = rows.filter((row: any) => {
    if (!searchTerm) return true;
    const item = row.itens;
    const haystack = `${item?.nome ?? ""} ${item?.cliente ?? ""}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  // Helper robusto para extrair o nome correto do estoque vinculado à linha
  const getEstoqueNome = (estoques: any) => {
    if (!estoques) return "Geral";
    if (Array.isArray(estoques)) {
      return estoques[0]?.nome ?? "Geral";
    }
    return estoques.nome ?? "Geral";
  };

  // 3. GERAÇÃO DO PDF
  const doc = new jsPDF();
  const dataEmissao = new Date().toLocaleString("pt-BR");

  let estoqueNomeHeader = "Geral";
  if (estoqueIdParam) {
    const ids = estoqueIdParam.split(",").filter(Boolean);
    if (ids.length > 1) {
      estoqueNomeHeader = "Locais Selecionados (Consolidado)";
    } else if (rows.length > 0) {
      estoqueNomeHeader = getEstoqueNome(rows[0]?.estoques);
    }
  }

  // Cabeçalho MC4 (Design Oficial)
  doc.setFillColor(0, 165, 181); // Ciano (#00A5B5)
  doc.rect(0, 0, 210, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("MC4 - GESTÃO DE ESTOQUE", 15, 22);

  // Painel de Auditoria
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Emitido por: ${profile?.full_name ?? user.email}`, 15, 45);
  doc.text(`Data de Emissão: ${dataEmissao}`, 15, 50);
  doc.text(`Filtro Local: ${estoqueNomeHeader}`, 15, 55);

  // Colunas e mapeamento incluindo o local onde o item se encontra fisicamente
  const tableColumn = ["Nome do Item", "Cliente", "Local de Estoque", "Quantidade"];
  const tableRows = filteredRows.map((row: any) => [
    row.itens?.nome ?? "Item Indisponível",
    row.itens?.cliente ?? "Geral",
    getEstoqueNome(row.estoques),
    Number(row.quantidade ?? 0).toLocaleString("pt-BR")
  ]);

  // CORREÇÃO CRÍTICA: cores RGB completas e válidas (arrays de 3 posições).
  // Valores corrompidos como [4, 5] ou [8-10] (que vira [-2]) geravam PDF inválido.
  autoTable(doc, {
    startY: 65,
    head: [tableColumn],
    body: tableRows,
    headStyles: {
      fillColor: [0, 165, 181], // Azul/Ciano MC4
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold"
    },
    styles: { fontSize: 9, cellPadding: 4 },
    alternateRowStyles: { fillColor: [245, 247, 250] }, // Sombreado sutil alternado
    theme: "grid",
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Este documento é um espelho oficial do inventário MC4 Stock.", 105, 285, { align: "center" });

  const pdfBuffer = doc.output("arraybuffer");
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Inventario_${estoqueNomeHeader.replace(/\s+/g, "_")}.pdf"`,
    },
  });
}
