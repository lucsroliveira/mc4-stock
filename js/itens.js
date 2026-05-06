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

    // 1. Função para carregar e listar itens
    async function listarItens() {
        const { data: itens, error } = await supabase
            .from('itens')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Erro ao listar:", error.message);
            return;
        }

        const tbody = document.getElementById('tabela-itens');
        tbody.innerHTML = itens.map(item => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="me-3 shadow-sm border" style="width: 50px; height: 50px; overflow: hidden; border-radius: 8px; background: #f8f9fa; flex-shrink: 0;">
                            ${item.foto_url 
                                ? `<img src="${item.foto_url}" style="width: 100%; height: 100%; object-fit: cover;">`
                                : `<div class="h-100 d-flex align-items-center justify-content-center text-muted" style="font-size: 20px;"><i class="fas fa-image"></i></div>`
                            }
                        </div>
                        <div>
                            <div class="fw-bold">${item.nome}</div>
                            <small class="text-muted text-truncate d-inline-block" style="max-width: 200px;">${item.descricao || '-'}</small>
                        </div>
                    </div>
                </td>
                <td><span class="badge bg-secondary">${item.categoria}</span></td>
                <td><span class="text fw-medium text">${item.cliente || 'Interno / MC4'}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger" onclick="deletarItem('${item.id}', '${item.foto_url}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // 2. Evento de submissão do formulário (INSERT com Upload de Foto)
    document.getElementById('form-item').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSalvar = e.target.querySelector('button[type="submit"]');
        const statusUpload = document.getElementById('upload-status');

        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

        try {
            // Captura dos IDs corretos do seu novo HTML
            const nome = document.getElementById('item-nome').value;
            const categoria = document.getElementById('item-categoria').value;
            const cliente = document.getElementById('item-cliente').value; // Pegando do Select
            const descricao = document.getElementById('item-descricao').value;
            const arquivoFoto = document.getElementById('item-foto').files[0];

            let urlPublica = null;

            // Lógica de Upload de Imagem
            if (arquivoFoto) {
                if (statusUpload) statusUpload.classList.remove('d-none');
                const nomeArquivo = `${Date.now()}_${arquivoFoto.name.replace(/\s/g, '_')}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('fotos-itens')
                    .upload(nomeArquivo, arquivoFoto);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('fotos-itens')
                    .getPublicUrl(nomeArquivo);
                
                urlPublica = publicUrl;
            }

            // Inserção no Banco
            const { error: dbError } = await supabase
                .from('itens')
                .insert([{ 
                    nome, 
                    categoria, 
                    descricao, 
                    cliente, // Salvando o Cliente selecionado
                    foto_url: urlPublica 
                }]);

            if (dbError) throw dbError;

            alert("✅ Item cadastrado com sucesso!");
            document.getElementById('form-item').reset();
            if (statusUpload) statusUpload.classList.add('d-none');
            listarItens();

        } catch (error) {
            alert("Erro na operação: " + error.message);
            console.error(error);
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = '<i class="fas fa-save me-2"></i>Salvar no Catálogo';
        }
    });

    // 3. Função global para deletar
    window.deletarItem = async (id, fotoUrl) => {
        if (confirm("Deseja realmente excluir este item?")) {
            const { error } = await supabase.from('itens').delete().eq('id', id);
            if (error) {
                alert("Erro ao excluir: " + error.message);
            } else {
                listarItens();
            }
        }
    };

    listarItens();
});