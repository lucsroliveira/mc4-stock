document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;

    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const senha = document.getElementById('login-senha').value;

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: senha,
            });

            if (error) {
                alert("Erro ao acessar: " + error.message);
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    // Função para Logout (pode ser chamada de qualquer página)
    window.logout = async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    };
});

// Função de Logout 
window.logout = async () => {
    const supabase = window.supabaseClient;
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        alert("Erro ao sair: " + error.message);
    } else {
        // Limpa qualquer dado residual e redireciona
        console.log("Sessão encerrada");
        window.location.href = 'login.html';
    }
};