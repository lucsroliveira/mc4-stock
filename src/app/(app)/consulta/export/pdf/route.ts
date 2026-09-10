import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);

  const estoqueIdParam = searchParams.get("estoqueId");
  const clienteParam = searchParams.get("cliente");
  const categoriaParam = searchParams.get("categoria");
  const searchTerm = searchParams.get("q")?.trim();

  // 1. VERIFICAÇÃO DE PERMISSÕES
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
    return new NextResponse("Clientes não possuem permissão para exportar.", { status: 403 });
  }

  // 2. BUSCA DE DADOS COM SUPORTE A MULTI-TENANCY, CATEGORIA E MÚLTIPLOS LOCAIS
  let query = supabase
    .from("estoque_itens")
    .select("quantidade, itens!inner(nome, cliente, categoria, ativo), estoques(nome)")
    .eq("itens.ativo", true);

  // Filtro por Locais de Estoque (suporta múltiplos IDs separados por vírgula)
  if (estoqueIdParam) {
    const ids = estoqueIdParam.split(",").filter(Boolean);
    if (ids.length > 0) {
      query = query.in("estoque_id", ids);
    }
  }

  // Filtro por Cliente Proprietário
  if (clienteParam) {
    query = query.eq("itens.cliente", clienteParam);
  }

  // Filtro por Categoria de Item (Brindes, Cenografia, Vestuário, OOH, etc.)
  if (categoriaParam) {
    query = query.eq("itens.categoria", categoriaParam);
  }

  const { data: inventoryData } = await query;
  const rows = inventoryData ?? [];

  // Filtragem local baseada no termo de busca textual (inclui Categoria no haystack)
  const filteredRows = rows.filter((row: any) => {
    if (!searchTerm) return true;
    const item = row.itens;
    const haystack = `${item?.nome ?? ""} ${item?.cliente ?? ""} ${item?.categoria ?? ""}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  // Helper para extrair o nome do local de estoque
  const getEstoqueNome = (estoques: any) => {
    if (!estoques) return "Geral";
    if (Array.isArray(estoques)) {
      return estoques[0]?.nome ?? "Geral";
    }
    return estoques.nome ?? "Geral";
  };

  // 3. MONTAGEM E GERAÇÃO DO PDF COM JSPDF
  const doc = new jsPDF();
  const dataEmissao = new Date().toLocaleString("pt-BR");

  let estoqueNomeHeader = "Geral / Todos";
  if (estoqueIdParam) {
    const ids = estoqueIdParam.split(",").filter(Boolean);
    if (ids.length > 1) {
      estoqueNomeHeader = "Locais Selecionados (Consolidado)";
    } else if (rows.length > 0) {
      estoqueNomeHeader = getEstoqueNome(rows[0]?.estoques);
    }
  }

  // Cabeçalho Oficial MC4
  doc.setFillColor(0, 165, 181); // Ciano (#00A5B5)
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("MC4 - GESTÃO DE ESTOQUE", 15, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("RELATÓRIO DE INVENTÁRIO", 15, 26);

  // Painel de Auditoria e Filtros Ativos
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Emitido por: ${profile?.full_name ?? user.email}`, 15, 40);
  doc.text(`Data de Emissão: ${dataEmissao}`, 15, 46);

  // Exibição explícita dos filtros aplicados no cabeçalho do PDF
  const filtrosAtivos = [];
  filtrosAtivos.push(`Local: ${estoqueNomeHeader}`);
  if (clienteParam) filtrosAtivos.push(`Cliente: ${clienteParam}`);
  if (categoriaParam) filtrosAtivos.push(`Categoria: ${categoriaParam}`);
  if (searchTerm) filtrosAtivos.push(`Busca: "${searchTerm}"`);

  doc.setFont("helvetica", "bold");
  doc.text(`Filtros: ${filtrosAtivos.join(" | ")}`, 15, 52);

  // Tabela de Dados com Coluna Explicita de Categoria
  const tableColumn = ["Nome do Item", "Cliente", "Categoria", "Local de Estoque", "Qtd"];
  const tableRows = filteredRows.map((row: any) => [
    row.itens?.nome ?? "Item Indisponível",
    row.itens?.cliente ?? "Geral",
    row.itens?.categoria ?? "-",
    getEstoqueNome(row.estoques),
    Number(row.quantidade ?? 0).toLocaleString("pt-BR"),
  ]);

  autoTable(doc, {
    startY: 58,
    head: [tableColumn],
    body: tableRows,
    headStyles: {
      fillColor: [0, 165, 181],
      textColor: [255, 255, 255],
      fontSize: 9.5,
      fontStyle: "bold",
    },
    styles: { fontSize: 8.5, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 55 }, // Nome do Item
      1: { cellWidth: 38 }, // Cliente
      2: { cellWidth: 32 }, // Categoria
      3: { cellWidth: 42 }, // Local de Estoque
      4: { cellWidth: 18, halign: "right" }, // Quantidade
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    theme: "grid",
  });

  // Totalizadores ao final da tabela
  const totalUnidades = filteredRows.reduce((acc: number, row: any) => acc + Number(row.quantidade ?? 0), 0);
  const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 200;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 32, 51);
  doc.text(
    `Total de Registros: ${filteredRows.length} item(ns)  |  Total de Unidades: ${totalUnidades.toLocaleString("pt-BR")}`,
    15,
    finalY
  );

  // Rodapé da página
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
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
