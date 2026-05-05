document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;

    // Função para verificar sessão (Segurança básica)
    async function verificarSessao() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) window.location.href = 'login.html';
    }
    verificarSessao();

    async function carregarRelatorio(filtros = {}) {
        // 1. Buscando dados (Adicionada a coluna observacao)
        let query = supabase
            .from('movimentacoes')
            .select(`
                data_movimentacao, 
                tipo, 
                quantidade, 
                criado_por,
                observacao, 
                itens ( nome, cliente ), 
                origem:estoques!origem_id ( nome ),
                destino:estoques!destino_id ( nome )
            `)
            .order('data_movimentacao', { ascending: false });

        // 2. Aplicação de filtros
        if (filtros.inicio) query = query.gte('data_movimentacao', filtros.inicio);
        if (filtros.fim) query = query.lte('data_movimentacao', filtros.fim + ' 23:59:59');
        if (filtros.tipo) query = query.eq('tipo', filtros.tipo);

        const { data, error } = await query;

        if (error) {
            console.error("Erro ao carregar dados:", error.message);
            return;
        }

        const tbody = document.getElementById('tabela-relatorio');
        
        // 3. Montagem da tabela com suporte a Campanha, Motivo e ícones
        tbody.innerHTML = data.map(m => {
            const dataFormatada = new Date(m.data_movimentacao).toLocaleString('pt-BR');
            
            // Lógica de cores para o Tipo
            let corBadge = 'bg-primary'; // Transferência
            if (m.tipo === 'entrada') corBadge = 'bg-success';
            if (m.tipo === 'saida') corBadge = 'bg-danger';

            return `
                <tr>
                    <td class="small text-nowrap">${dataFormatada}</td>
                    <td>
                        <div class="fw-bold">${m.itens?.nome || 'Item Excluído'}</div>
                        <div class="small text-muted italic">
                            <i class="fas fa-tag me-1"></i>${m.itens?.cliente || 'Geral / Sem Campanha'}
                        </div>
                    </td>
                    <td class="text-center">
                        <span class="badge ${corBadge} text-uppercase" style="min-width: 90px;">
                            ${m.tipo}
                        </span>
                    </td>
                    <td class="text-center fw-bold">${m.quantidade}</td>
                    <td>
                        <div class="d-flex align-items-center small">
                            <span>${m.origem?.nome || '<i class="text-muted">Externo</i>'}</span>
                            <i class="fas fa-arrow-right mx-2 text-muted" style="font-size: 0.7rem;"></i>
                            <span>${m.destino?.nome || '<i class="text-muted">Baixa</i>'}</span>
                        </div>
                    </td>
                    <td class="small text-muted" style="max-width: 200px;">
                        ${m.observacao || '<span class="opacity-50">Sem descrição</span>'}
                    </td>
                    <td class="small">
                        <i class="fas fa-user-circle me-1 text-secondary"></i>
                        ${m.criado_por ? m.criado_por.split('@')[0] : 'Sistema'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Evento do formulário de filtro
    document.getElementById('form-filtro').addEventListener('submit', (e) => {
        e.preventDefault();
        carregarRelatorio({
            inicio: document.getElementById('data-inicio').value,
            fim: document.getElementById('data-fim').value,
            tipo: document.getElementById('filtro-tipo').value
        });
    });

    // Carga inicial
    carregarRelatorio();
});

// 4. Função de Exportação CSV
window.exportarCSV = function() {
    const rows = [];
    const tableRows = document.querySelectorAll("table tr");
    
    for (const row of tableRows) {
        const cols = row.querySelectorAll("td, th");
        const rowData = Array.from(cols).map(c => `"${c.innerText.replace(/\n/g, ' ')}"`).join(",");
        rows.push(rowData);
    }
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Relatorio_Estoque_MC4_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};