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
    const selectEstoque = document.getElementById('select-estoque-consulta');
    const areaResultados = document.getElementById('area-resultados');
    const mensagemVazia = document.getElementById('mensagem-vazia');
    const tabelaInventario = document.getElementById('tabela-inventario');
    const inputFiltro = document.getElementById('filtro-campanha');

    // 1. Carregar a lista de estoques no select
    async function carregarEstoques() {
        const { data: estoques } = await supabase.from('estoques').select('id, nome').order('nome');
        if (estoques) {
            selectEstoque.innerHTML = '<option value="">Escolha um local...</option>' + 
                estoques.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
        }
    }

    // 2. Buscar itens do estoque selecionado (Removido estoque_minimo da busca)
    async function buscarInventario(estoqueId) {
        if (!estoqueId) {
            areaResultados.style.display = 'none';
            mensagemVazia.style.display = 'block';
            return;
        }

        const { data: itensEstoque, error } = await supabase
            .from('estoque_itens')
            .select(`
                quantidade,
                itens ( nome, categoria, cliente, foto_url )
            `)
            .eq('estoque_id', estoqueId);

        if (error) {
            console.error("Erro ao buscar inventário:", error.message);
            return;
        }

        exibirTabela(itensEstoque);
    }

    // 3. Renderizar a tabela (Simplificada: sem alertas de mínimo)
    function exibirTabela(dados) {
        mensagemVazia.style.display = 'none';
        areaResultados.style.display = 'block';

        if (!dados || dados.length === 0) {
            tabelaInventario.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Este local está vazio.</td></tr>';
            return;
        }

        tabelaInventario.innerHTML = dados.map(row => {
            const item = row.itens;
            const qtd = row.quantidade;

            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="me-3 shadow-sm border" style="width: 45px; height: 45px; overflow: hidden; border-radius: 6px; background: #f8f9fa; flex-shrink: 0;">
                                ${item.foto_url 
                                    ? `<img src="${item.foto_url}" style="width: 100%; height: 100%; object-fit: cover;">`
                                    : `<div class="h-100 d-flex align-items-center justify-content-center text-muted" style="font-size: 14px;"><i class="fas fa-image"></i></div>`
                                }
                            </div>
                            <div>
                                <div class="fw-bold">${item.nome}</div>
                                <small class="text-muted">${item.categoria || 'Geral'}</small>
                            </div>
                        </div>
                    </td>
                    <td><span class="text fw-medium text-primary">${item.cliente || 'Interno'}</span></td>
                    <td class="text-center">
                        <h4 class="mb-0 text-dark">${qtd}</h4>
                    </td>
                    <td class="text-end">
                        <span class="badge bg-light text-muted border">Saldo Real</span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 4. Lógica do Filtro Dinâmico
    inputFiltro.addEventListener('input', function() {
        const termo = this.value.toLowerCase();
        const linhas = tabelaInventario.getElementsByTagName('tr');

        for (let i = 0; i < linhas.length; i++) {
            const conteudoLinha = linhas[i].textContent.toLowerCase();
            if (conteudoLinha.includes(termo)) {
                linhas[i].style.display = "";
            } else {
                linhas[i].style.display = "none";
            }
        }
    });

    selectEstoque.addEventListener('change', (e) => {
        inputFiltro.value = ""; 
        buscarInventario(e.target.value);
    });

    carregarEstoques();
});