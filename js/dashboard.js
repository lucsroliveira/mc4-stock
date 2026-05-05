// Verificação de Sessão
async function verificarSessao() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    }
}
verificarSessao();

document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;

    async function carregarDashboard() {
        try {
            // 1. Contagem de Itens e Estoques (Cards de cima)
            const { count: countItens } = await supabase.from('itens').select('*', { count: 'exact', head: true });
            const { count: countEstoques } = await supabase.from('estoques').select('*', { count: 'exact', head: true });
            
            document.getElementById('total-itens').innerText = countItens || 0;
            document.getElementById('total-estoques').innerText = countEstoques || 0;

            // 2. Histórico Recente (Tabela da esquerda)
            const { data: movs } = await supabase
                .from('movimentacoes')
                .select(`
                    data_movimentacao, tipo, quantidade,
                    itens ( nome ),
                    origem:estoques!origem_id ( nome ),
                    destino:estoques!destino_id ( nome )
                `)
                .order('data_movimentacao', { ascending: false })
                .limit(6);

            const listaMovs = document.getElementById('lista-movimentacoes');
            if (movs) {
                listaMovs.innerHTML = movs.map(m => {
                    let corBadge = m.tipo === 'entrada' ? 'success' : (m.tipo === 'saida' ? 'danger' : 'primary');
                    let infoLocal = m.tipo === 'entrada' ? m.destino?.nome : (m.tipo === 'saida' ? m.origem?.nome : `${m.origem?.nome || 'Ext.'} → ${m.destino?.nome || 'Baixa'}`);
                    
                    return `
                        <tr>
                            <td class="small text-muted">${new Date(m.data_movimentacao).toLocaleDateString()}</td>
                            <td><strong>${m.itens?.nome || 'Item'}</strong></td>
                            <td><span class="badge bg-${corBadge}">${m.tipo}</span></td>
                            <td class="small text-muted">${infoLocal}</td>
                            <td><strong>${m.quantidade}</strong></td>
                        </tr>
                    `;
                }).join('');
            }

            // 3. Saldo Total em Rede (Coluna da direita)
            const { data: saldos } = await supabase
                .from('estoque_itens')
                .select('quantidade, itens(nome, cliente)'); // Removido estoque_minimo

            const resumoItens = {};
            saldos.forEach(s => {
                const item = s.itens;
                if (!item) return;
                if (!resumoItens[item.nome]) {
                    resumoItens[item.nome] = { 
                        total: 0, 
                        cliente: item.cliente || 'Geral'
                    };
                }
                resumoItens[item.nome].total += s.quantidade;
            });

            const listaSaldo = document.getElementById('lista-saldo-geral');
            
            if (listaSaldo) {
                listaSaldo.innerHTML = Object.entries(resumoItens).map(([nome, dados]) => {
                    return `
                        <div class="list-group-item d-flex justify-content-between align-items-center border-0 border-bottom">
                            <div>
                                <div class="fw-bold">${nome}</div>
                                <small class="text-muted">${dados.cliente}</small>
                            </div>
                            <span class="badge bg-dark rounded-pill">
                                ${dados.total}
                            </span>
                        </div>
                    `;
                }).join('') || '<p class="p-3 text-muted">Nenhum saldo.</p>';
            }

            // 4. Inicializar Gráficos
            inicializarGraficos();

        } catch (err) {
            console.error("Erro ao carregar dashboard:", err);
        }
    }

    async function inicializarGraficos() {
        // --- GRÁFICO 1: CATEGORIAS ---
        const { data: itensDB } = await supabase.from('itens').select('categoria');
        const contagemCat = {};
        itensDB.forEach(i => {
            const cat = i.categoria || 'Geral';
            contagemCat[cat] = (contagemCat[cat] || 0) + 1;
        });

        const chartCatElement = document.getElementById('chartCategorias');
        if (chartCatElement) {
            new Chart(chartCatElement, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(contagemCat),
                    datasets: [{
                        data: Object.values(contagemCat),
                        backgroundColor: ['#416ba9', '#00A5B5', '#2c3e50', '#95a5a6']
                    }]
                },
                options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
            });
        }

        // --- GRÁFICO 2: MOVIMENTAÇÕES (Últimos 7 dias) ---
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

        const { data: movsGrafico } = await supabase
            .from('movimentacoes')
            .select('data_movimentacao, tipo')
            .gte('data_movimentacao', seteDiasAtras.toISOString());

        const dias = {};
        for(let i=6; i>=0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dias[d.toLocaleDateString('pt-BR', {weekday: 'short'})] = { entrada: 0, saida: 0 };
        }

        if (movsGrafico) {
            movsGrafico.forEach(m => {
                const diaSemana = new Date(m.data_movimentacao).toLocaleDateString('pt-BR', {weekday: 'short'});
                if(dias[diaSemana]) {
                    if(m.tipo === 'entrada') dias[diaSemana].entrada++;
                    else if(m.tipo === 'saida') dias[diaSemana].saida++;
                }
            });
        }

        const chartMovElement = document.getElementById('chartMovimentacoes');
        if (chartMovElement) {
            new Chart(chartMovElement, {
                type: 'bar',
                data: {
                    labels: Object.keys(dias),
                    datasets: [
                        { label: 'Entradas', data: Object.values(dias).map(d => d.entrada), backgroundColor: '#00A5B5' },
                        { label: 'Saídas', data: Object.values(dias).map(d => d.saida), backgroundColor: '#416ba9' }
                    ]
                },
                options: { 
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
    }

    carregarDashboard();
});