document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    let saldoDisponivel = 0; 

    // Elementos da UI
    const form = document.getElementById('form-movimentacao');
    const selectItem = document.getElementById('select-item');
    const selectTipo = document.getElementById('select-tipo'); 
    const selectOrigem = document.getElementById('select-origem'); 
    const selectDestino = document.getElementById('select-destino'); 
    const inputQtd = document.getElementById('mov-quantidade');
    const inputMotivo = document.getElementById('mov-motivo'); // Novo campo
    const infoSaldo = document.getElementById('info-saldo');
    const valorDisponivel = document.getElementById('valor-disponivel');
    const btnSalvar = form.querySelector('button[type="submit"]');

    // 1. VERIFICAR SESSÃO
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // --- FUNÇÃO PARA TRAVAR/LIBERAR CAMPOS (NOVA) ---
    function ajustarCamposPorTipo() {
        const tipo = selectTipo.value;

        if (tipo === 'entrada') {
            // Entrada: Origem desnecessária, Destino obrigatório
            selectOrigem.disabled = true;
            selectOrigem.value = "";
            selectOrigem.required = false;
            
            selectDestino.disabled = false;
            selectDestino.required = true;
        } 
        else if (tipo === 'saida') {
            // Saída: Destino desnecessário, Origem obrigatória
            selectDestino.disabled = true;
            selectDestino.value = "";
            selectDestino.required = false;
            
            selectOrigem.disabled = false;
            selectOrigem.required = true;
        } 
        else {
            // Transferência: Ambos obrigatórios
            selectOrigem.disabled = false;
            selectDestino.disabled = false;
            selectOrigem.required = true;
            selectDestino.required = true;
        }
        verificarSaldoReal(); // Atualiza saldo ao mudar tipo
    }

    // 2. CARREGAR SELECTS
    async function carregarDadosIniciais() {
        try {
            const [resItens, resEstoques] = await Promise.all([
                supabase.from('itens').select('id, nome').order('nome'),
                supabase.from('estoques').select('id, nome').order('nome')
            ]);

            if (resItens.data) {
                selectItem.innerHTML = '<option value="">Selecione o Item...</option>' + 
                    resItens.data.map(i => `<option value="${i.id}">${i.nome}</option>`).join('');
            }

            if (resEstoques.data) {
                const optionsEstoques = resEstoques.data.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
                selectOrigem.innerHTML = '<option value="">-- Selecione a Origem --</option>' + optionsEstoques;
                selectDestino.innerHTML = '<option value="">-- Selecione o Destino --</option>' + optionsEstoques;
            }
            
            ajustarCamposPorTipo(); // Aplica trava inicial
        } catch (error) {
            console.error("Erro ao carregar selects:", error);
        }
    }

    // 3. LÓGICA DE VALIDAÇÃO DE SALDO
    async function verificarSaldoReal() {
        const itemId = selectItem.value;
        const origemId = selectOrigem.value;
        const tipo = selectTipo.value;

        // Só faz sentido checar saldo se houver uma Origem (Saída ou Transferência)
        if ((tipo === 'saida' || tipo === 'transferencia') && itemId && origemId) {
            const { data } = await supabase
                .from('estoque_itens')
                .select('quantidade')
                .eq('item_id', itemId)
                .eq('estoque_id', origemId)
                .single();

            saldoDisponivel = data ? data.quantidade : 0;
            valorDisponivel.innerText = saldoDisponivel;
            infoSaldo.classList.remove('d-none');
            valorDisponivel.className = saldoDisponivel <= 0 ? 'text-danger fw-bold' : 'text-primary fw-bold';
        } else {
            infoSaldo.classList.add('d-none');
            saldoDisponivel = (tipo === 'entrada') ? Infinity : 0; 
        }
    }

    // Ouvintes
    selectItem.addEventListener('change', verificarSaldoReal);
    selectOrigem.addEventListener('change', verificarSaldoReal);
    selectTipo.addEventListener('change', ajustarCamposPorTipo);

    // 4. SUBMIT DO FORMULÁRIO
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const qtdInformada = parseInt(inputQtd.value);
        const tipo = selectTipo.value;

        // Validação de segurança antes de chamar o banco
        if ((tipo === 'saida' || tipo === 'transferencia') && qtdInformada > saldoDisponivel) {
            alert(`❌ Saldo insuficiente na origem! Disponível: ${saldoDisponivel}`);
            return;
        }

        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';

        try {
            // Executa a função no Supabase que atualiza os saldos
            const { error: rpcError } = await supabase.rpc('atualizar_estoque', {
                p_item_id: selectItem.value,
                p_origem_id: selectOrigem.value || null,
                p_destino_id: selectDestino.value || null,
                p_quantidade: qtdInformada
            });

            if (rpcError) throw rpcError;

            // Insere o registro histórico com a observação/motivo
            const { error: insertError } = await supabase.from('movimentacoes').insert([{
                item_id: selectItem.value,
                tipo: tipo,
                origem_id: selectOrigem.value || null,
                destino_id: selectDestino.value || null,
                quantidade: qtdInformada,
                observacao: inputMotivo.value, // Novo campo salvo aqui
                criado_por: session.user.email
            }]);

            if (insertError) throw insertError;

            alert("✅ Movimentação realizada com sucesso!");
            window.location.href = 'index.html';

        } catch (error) {
            alert("Erro: " + error.message);
            btnSalvar.disabled = false;
            btnSalvar.innerText = 'Confirmar Movimentação';
        }
    });

    carregarDadosIniciais();
});