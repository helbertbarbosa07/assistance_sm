// ==============================
// VARIÁVEIS GLOBAIS
// ==============================
let db;
let currentUser = null;

// ==============================
// INICIALIZAÇÃO DO SISTEMA
// ==============================
async function initializeSystem() {
  console.log('Iniciando sistema...');
  
  try {
    // 1. VERIFICAR AUTENTICAÇÃO
    const loggedUser = localStorage.getItem('assistance_logged_user');
    
    if (!loggedUser) {
      // Redirecionar para login
      window.location.href = 'login.html';
      return;
    }
    
    try { 
      currentUser = JSON.parse(loggedUser); 
    } catch(e) { 
      console.error('Erro ao parsear usuário:', e);
      // Usuário padrão
      currentUser = { 
        username: 'guest', 
        nome: 'Visitante', 
        role: 'user' 
      };
    }
    
    console.log('Usuário atual:', currentUser);
    
    // 2. INICIALIZAR BANCO DE DADOS
    await initDatabase();
    
    // 3. CARREGAR DADOS INICIAIS
    await loadInitialData();
    
    // 4. ATUALIZAR INTERFACE
    updateUserInterface();
    
    // 5. CONFIGURAR NAVEGAÇÃO
    setupNavigation();
    
    // 6. CARREGAR DASHBOARD
    updateDashboardStats();
    
    // 7. MOSTRAR SISTEMA
    document.getElementById('app').style.display = 'flex';
    
    console.log('✅ Sistema inicializado com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema:', error);
    
    // Tentar mostrar sistema mesmo com erro
    try {
      document.getElementById('app').style.display = 'flex';
      document.getElementById('dashboardStats').innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle"></i>
          Erro ao carregar dados. Recarregue a página.
        </div>
      `;
    } catch (e) {
      alert('Erro crítico ao inicializar. Recarregue a página.');
    }
  }
}

// ==============================
// FUNÇÃO DE BANCO DE DADOS
// ==============================
function initDatabase() {
  return new Promise((resolve, reject) => {
    console.log('Abrindo banco de dados...');
    
    const request = indexedDB.open('AssistanceSistemaDB', 2);
    
    request.onerror = (event) => {
      console.error('❌ Erro ao abrir banco:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('✅ Banco de dados aberto com sucesso');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      console.log('Atualizando banco de dados...');
      const db = event.target.result;
      
      // Tabela de usuários
      if (!db.objectStoreNames.contains('users')) {
        console.log('Criando tabela de usuários...');
        const usersStore = db.createObjectStore('users', { keyPath: 'username' });
        usersStore.createIndex('nome', 'nome', { unique: false });
        usersStore.createIndex('role', 'role', { unique: false });
      }
      
      // Tabela de cursos
      if (!db.objectStoreNames.contains('courses')) {
        console.log('Criando tabela de cursos...');
        const coursesStore = db.createObjectStore('courses', { keyPath: 'id' });
        coursesStore.createIndex('name', 'name', { unique: true });
      }
      
      // Tabela de feedbacks
      if (!db.objectStoreNames.contains('feedbacks')) {
        console.log('Criando tabela de feedbacks...');
        const feedbacksStore = db.createObjectStore('feedbacks', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        feedbacksStore.createIndex('userId', 'userId', { unique: false });
      }
      
      console.log('✅ Estrutura do banco atualizada');
    };
  });
}

// ==============================
// CARREGAR DADOS INICIAIS
// ==============================
async function loadInitialData() {
  console.log('Verificando dados iniciais...');
  
  try {
    const users = await getAllUsers();
    
    if (users.length === 0) {
      console.log('Criando dados iniciais...');
      
      // Usuários iniciais
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
          nome: 'Usuário Comum',
          senha: 'user123',
          role: 'user',
          status: 'active'
        }
      ];
      
      // Adicionar usuários
      for (const user of initialUsers) {
        await addUser(user);
      }
      
      console.log(`✅ ${initialUsers.length} usuários criados`);
    } else {
      console.log(`✅ ${users.length} usuários encontrados`);
    }
    
  } catch (error) {
    console.warn('⚠️ Erro ao carregar dados iniciais:', error);
    // Continuar mesmo com erro
  }
}

// ==============================
// FUNÇÕES AUXILIARES DO BANCO
// ==============================

// Obter todos os usuários
async function getAllUsers() {
  return new Promise((resolve, reject) => {
    if (!db) return resolve([]);
    
    const transaction = db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => {
      console.warn('Erro ao buscar usuários:', request.error);
      resolve([]);
    };
  });
}

// Adicionar usuário
async function addUser(user) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    const request = store.add(user);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Obter todos os cursos
async function getAllCourses() {
  return new Promise((resolve, reject) => {
    if (!db) return resolve([]);
    
    const transaction = db.transaction(['courses'], 'readonly');
    const store = transaction.objectStore('courses');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => {
      console.warn('Erro ao buscar cursos:', request.error);
      resolve([]);
    };
  });
}

// ==============================
// ATUALIZAR INTERFACE DO USUÁRIO
// ==============================
function updateUserInterface() {
  if (!currentUser) return;
  
  console.log('Atualizando interface para:', currentUser.nome);
  
  // Atualizar elementos
  const elements = {
    userName: document.getElementById('userName'),
    userRole: document.getElementById('userRole'),
    userAvatar: document.getElementById('userAvatar'),
    welcomeMessage: document.getElementById('welcomeMessage')
  };
  
  // Atualizar se existirem
  if (elements.userName) {
    elements.userName.textContent = currentUser.nome;
  }
  
  if (elements.userRole) {
    elements.userRole.textContent = currentUser.role === 'admin' ? 'Administrador' : 'Usuário';
  }
  
  if (elements.userAvatar) {
    const initials = currentUser.nome.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
    elements.userAvatar.textContent = initials;
  }
  
  if (elements.welcomeMessage) {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour < 12) greeting = 'Bom dia';
    else if (hour < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';
    
    elements.welcomeMessage.innerHTML = `${greeting}, <strong>${currentUser.nome}</strong>!`;
  }
}

// ==============================
// NAVEGAÇÃO
// ==============================
function setupNavigation() {
  console.log('Configurando navegação...');
  
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      const pageId = this.getAttribute('data-page');
      loadPage(pageId, this);
    });
  });
}

function loadPage(pageId, navElement) {
  console.log('Carregando página:', pageId);
  
  // Remover active de todos
  document.querySelectorAll('.nav-item').forEach(nav => {
    nav.classList.remove('active');
  });
  
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Adicionar active aos selecionados
  if (navElement) {
    navElement.classList.add('active');
  }
  
  const pageElement = document.getElementById(`${pageId}Page`);
  if (pageElement) {
    pageElement.classList.add('active');
  }
  
  // Carregar conteúdo específico da página
  switch(pageId) {
    case 'dashboard':
      updateDashboardStats();
      break;
    case 'courses':
      if (typeof initCoursesPage === 'function') {
        initCoursesPage();
      }
      break;
    case 'feedback':
      if (typeof initFeedbackPage === 'function') {
        initFeedbackPage();
      }
      break;
    case 'ia':
      if (typeof initChatPage === 'function') {
        initChatPage();
      }
      break;
  }
}

// ==============================
// DASHBOARD
// ==============================
async function updateDashboardStats() {
  console.log('Atualizando dashboard...');
  
  try {
    const courses = await getAllCourses();
    const users = await getAllUsers();
    
    const container = document.getElementById('dashboardStats');
    if (container) {
      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
          <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="font-size: 24px; font-weight: bold; color: var(--primary);">
              ${currentUser ? currentUser.username : 'N/A'}
            </div>
            <div style="color: var(--secondary); font-size: 14px;">
              Seu Usuário
            </div>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="font-size: 24px; font-weight: bold; color: var(--success);">
              ${courses.length}
            </div>
            <div style="color: var(--secondary); font-size: 14px;">
              Cursos Disponíveis
            </div>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="font-size: 24px; font-weight: bold; color: var(--info);">
              ${users.length}
            </div>
            <div style="color: var(--secondary); font-size: 14px;">
              Total de Usuários
            </div>
          </div>
        </div>
      `;
    }
    
  } catch (error) {
    console.error('Erro ao atualizar dashboard:', error);
    
    const container = document.getElementById('dashboardStats');
    if (container) {
      container.innerHTML = `
        <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <i class="fas fa-exclamation-triangle"></i>
          Erro ao carregar estatísticas
        </div>
      `;
    }
  }
}

// ==============================
// FUNÇÕES GLOBAIS
// ==============================
function logout() {
  if (confirm('Deseja realmente sair?')) {
    localStorage.removeItem('assistance_logged_user');
    window.location.href = 'login.html';
  }
}

function clearCache() {
  if (confirm('Limpar cache do navegador?')) {
    sessionStorage.clear();
    localStorage.removeItem('assistance_logged_user');
    alert('Cache limpo! Faça login novamente.');
    window.location.href = 'login.html';
  }
}

// ==============================
// INICIAR QUANDO O DOM ESTIVER PRONTO
// ==============================
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM carregado, inicializando sistema...');
  setTimeout(() => {
    initializeSystem();
  }, 100);
});

// ==============================
// EXPORTAR FUNÇÕES PARA HTML
// ==============================
window.logout = logout;
window.clearCache = clearCache;
window.loadPage = loadPage;

// Adicione estas linhas se usar outros módulos
if (typeof initCoursesPage === 'undefined') {
  window.initCoursesPage = function() {
    console.log('Função initCoursesPage não implementada');
  };
}

if (typeof initFeedbackPage === 'undefined') {
  window.initFeedbackPage = function() {
    console.log('Função initFeedbackPage não implementada');
  };
}

if (typeof initChatPage === 'undefined') {
  window.initChatPage = function() {
    console.log('Função initChatPage não implementada');
  };
}
