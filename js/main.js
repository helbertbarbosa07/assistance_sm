// Inicialização do sistema
async function initializeSystem() {
  try {
    // Verificar autenticação
    const loggedUser = localStorage.getItem('assistance_logged_user');
    if (loggedUser) {
      try { 
        currentUser = JSON.parse(loggedUser); 
      } catch(e) { 
        currentUser = { username: 'guest', nome: 'Visitante', role: 'user' };
      }
    } else {
      // Redirecionar para login se não estiver autenticado
      window.location.href = 'login.html';
      return;
    }
    
    // Inicializar banco de dados
    await initDatabase();
    
    // Carregar dados iniciais
    await loadInitialData();
    
    // Atualizar interface
    updateUserInterface();
    
    // Configurar navegação
    setupNavigation();
    
    // Atualizar dashboard
    updateDashboardStats();
    
    // Mostrar sistema
    document.getElementById('app').style.display = 'flex';
    
    console.log('Sistema inicializado com sucesso');
    
  } catch (error) {
    console.error('Erro ao inicializar sistema:', error);
    alert('Erro ao inicializar sistema. Por favor, recarregue a página.');
  }
}

async function loadInitialData() {
  const users = await getAllUsers();
  if (users.length === 0) {
    // Adicionar usuários iniciais
    const initialUsers = [
      {
        username: 'admin',
        nome: 'Administrador',
        senha: 'admin123',
        role: 'admin',
        status: 'active'
      },
      {
        username: 'user',
        nome: 'Usuário',
        senha: 'user123',
        role: 'user',
        status: 'active'
      }
    ];
    
    for (const user of initialUsers) {
      await addUser(user);
    }
    
    console.log('Dados iniciais carregados com sucesso');
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initializeSystem);
