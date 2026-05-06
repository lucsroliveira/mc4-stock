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

    // 1. Listar estoques existentes (Atualizado com Responsável e Contato)
    async function listarEstoques() {
        const { data: estoques, error } = await supabase
            .from('estoques')
            .select('*')
            .order('nome', { ascending: true });

        if (error) {
            console.error("Erro ao listar estoques:", error.message);
            return;
        }

        const tbody = document.getElementById('tabela-estoques');
        tbody.innerHTML = estoques.map(e => `
            <tr>
                <td><strong>${e.nome}</strong></td>
                <td>
                    <span class="badge ${e.tipo === 'Temporario' ? 'bg-warning text-dark' : 'bg-info'}">
                        ${e.tipo === 'Temporario' ? 'Veículo' : 'Regional'}
                    </span>
                </td>
                <td><i class="fas fa-user-tie me-2 text-muted"></i>${e.responsavel || '-'}</td>
                <td>
                    <a href="https://wa.me/${e.contato?.replace(/\D/g, '')}" target="_blank" class="text-decoration-none text-muted">
                        <i class="fab fa-whatsapp text-success me-1"></i> ${e.contato || '-'}
                    </a>
                </td>
                <td class="small">${e.endereco || '-'}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger" onclick="deletarEstoque('${e.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // 2. Cadastrar novo estoque (Capturando os novos campos)
    document.getElementById('form-estoque').addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('estoque-nome').value;
        const tipo = document.getElementById('estoque-tipo').value;
        const responsavel = document.getElementById('estoque-responsavel').value; // NOVO
        const contato = document.getElementById('estoque-contato').value;
        const endereco = document.getElementById('estoque-endereco').value;

        const { error } = await supabase
            .from('estoques')
            .insert([{ 
                nome, 
                tipo, 
                responsavel, // Enviando para o banco
                contato, 
                endereco 
            }]);

        if (error) {
            alert("Erro ao salvar local: " + error.message);
        } else {
            alert("✅ Local de estoque cadastrado com sucesso!");
            document.getElementById('form-estoque').reset();
            listarEstoques();
        }
    });

    // 3. Deletar estoque
    window.deletarEstoque = async (id) => {
        if (confirm("Tem certeza? Se houver itens vinculados a este local, o banco impedirá a exclusão por segurança.")) {
            const { error } = await supabase.from('estoques').delete().eq('id', id);
            if (error) {
                alert("Erro: Não é possível apagar um estoque que já possui saldo ou histórico de movimentação.");
            } else {
                listarEstoques();
            }
        }
    };

    listarEstoques();
});