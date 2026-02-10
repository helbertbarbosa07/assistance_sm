// js/script.js - Sistema completo com API Neon + Vercel - CORRIGIDO

// ==============================
// CONFIGURAÇÕES GLOBAIS
// ==============================
const CONFIG = {
    // API Base URL - Ajuste para sua URL do Vercel
    API_BASE_URL: localStorage.getItem('api_url') || 'https://assistance-sm.vercel.app/api',
    
    // Chaves para autenticação
    JWT_TOKEN: localStorage.getItem('jwt_token'),
    
    // Configurações da IA
    OPENROUTER_API_KEY: localStorage.getItem('openrouter_api_key') || '',
    AI_MODEL: localStorage.getItem('ai_model') || 'mistralai/mistral-7b-instruct:free',
    AI_TEMPERATURE: parseFloat(localStorage.getItem('ai_temperature') || '0.7'),
    
    // URLs das APIs
    OPENROUTER_URL: 'https://openrouter.ai/api/v1/chat/completions',
    
    // Estado do sistema
    currentUser: null,
    isAdmin: false,
    currentPage: 'ia',
    selectedCourse: null,
    editingCourseId: null
};

// ==============================
// FUNÇÕES AUXILIARES DE LOGIN
// ==============================
function showTab(tabName, element) {
    // Esconder todas as tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remover active de todos os botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar a tab selecionada
    document.getElementById(tabName + 'Tab').style.display = 'block';
    
    // Ativar o botão clicado
    element.classList.add('active');
}

// ==============================
// FUNÇÕES DE LOGIN - CORRIGIDAS
// ==============================
function loginAsUser() {
    const username = document.getElementById('username').value.trim();
    const name = username || 'Visitante';
    
    // Criar usuário local sem necessidade de API
    const user = {
        id: `local_${Date.now()}`,
        name: name,
        role: 'user',
        avatar: name.charAt(0).toUpperCase()
    };
    
    // Gerar token JWT simples (para consistência com o sistema)
    const token = generateSimpleToken(user);
    CONFIG.JWT_TOKEN = token;
    localStorage.setItem('jwt_token', token);
    
    startUserApp(user);
}

function generateSimpleToken(user) {
    // Gerar um token simples base64 para usuários locais
    const tokenData = {
        id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
    };
    
    return btoa(JSON.stringify(tokenData));
}

async function loginAsAdmin() {
    const username = document.getElementById('adminUser').value.trim();
    const password = document.getElementById('adminPass').value.trim();
    
    if (!username || !password) {
        showNotification('Preencha todos os campos', 'error');
        return;
    }
    
    // Verificação local para admin padrão
    if (username === 'admin' && password === 'admin123') {
        const adminUser = {
            id: 'admin_1',
            name: 'Administrador',
            email: 'admin@assistance.com',
            role: 'admin',
            avatar: 'A'
        };
        
        const token = generateSimpleToken(adminUser);
        CONFIG.JWT_TOKEN = token;
        localStorage.setItem('jwt_token', token);
        
        startAdminApp(adminUser);
        showNotification('Login admin realizado com sucesso!', 'success');
        return;
    }
    
    // Se não for o admin padrão, tentar API
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                isAdmin: true
            })
        });
        
        // Verificar se a resposta é JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Resposta da API não é JSON');
        }
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            showNotification(data.message || 'Credenciais inválidas', 'error');
            return;
        }
        
        CONFIG.JWT_TOKEN = data.token;
        localStorage.setItem('jwt_token', data.token);
        startAdminApp(data.user);
        
    } catch (error) {
        console.error('Erro no login admin:', error);
        
        // Fallback: criar admin local em caso de erro de API
        if (username === 'admin') {
            const adminUser = {
                id: 'admin_local',
                name: 'Administrador Local',
                email: 'admin@local.com',
                role: 'admin',
                avatar: 'A'
            };
            
            const token = generateSimpleToken(adminUser);
            CONFIG.JWT_TOKEN = token;
            localStorage.setItem('jwt_token', token);
            
            startAdminApp(adminUser);
            showNotification('Usando modo offline - Admin local ativado', 'warning');
        } else {
            showNotification('Erro ao conectar com a API. Tente admin/admin123', 'error');
        }
    }
}

// ==============================
// INICIALIZAÇÃO DOS APPS
// ==============================
function startUserApp(user) {
    CONFIG.currentUser = user;
    CONFIG.isAdmin = false;
    
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appUser').style.display = 'flex';
    
    // Atualizar informações do usuário
    document.getElementById('userAvatar').textContent = user.avatar;
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = 'Usuário';
    document.getElementById('userFullNameUser').textContent = user.name;
    document.getElementById('welcomeMessageUser').innerHTML = 
        `Olá, <strong>${user.name}</strong>!`;
    
    // Verificar status da API
    checkAPIStatus();
    
    // Carregar cursos
    loadCoursesFromAPI();
    
    // Configurar navegação
    setupUserNavigation();
    
    // Configurar eventos do chat
    setupChatEvents();
    
    // Verificar configuração da IA
    checkAIConfig();
    
    showNotification(`Bem-vindo, ${user.name}!`, 'success');
}

function startAdminApp(user) {
    CONFIG.currentUser = user;
    CONFIG.isAdmin = true;
    
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appAdmin').style.display = 'flex';
    
    // Atualizar informações do admin
    document.getElementById('adminAvatar').textContent = user.avatar || 'A';
    document.getElementById('adminName').textContent = user.name;
    document.getElementById('adminRole').textContent = 'Administrador';
    document.getElementById('adminFullName').textContent = user.name;
    document.getElementById('welcomeMessageAdmin').innerHTML = 
        `Painel Admin, <strong>${user.name}</strong>!`;
    
    // Verificar status da API
    checkAPIStatusAdmin();
    
    // Configurar navegação
    setupAdminNavigation();
    
    // Carregar dashboard
    loadAdminDashboard();
    
    // Verificar configuração da IA
    checkAIConfigAdmin();
    
    // Carregar configurações salvas
    loadSavedSettings();
    
    showNotification(`Painel admin iniciado para ${user.name}`, 'success');
}

// ... (restante do código permanece igual, exceto pela função checkAPIStatus corrigida abaixo) ...

// ==============================
// FUNÇÕES UTILITÁRIAS
// ==============================
async function checkAPIStatus() {
    const badge = document.getElementById('apiStatusBadge');
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            badge.className = 'badge badge-success';
            badge.innerHTML = '<i class="fas fa-plug"></i> API: ONLINE';
            badge.title = `Banco: ${data.database || 'Conectado'}`;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.log('API offline, usando modo local');
        badge.className = 'badge badge-warning';
        badge.innerHTML = '<i class="fas fa-plug"></i> API: OFFLINE';
        badge.title = 'Usando dados locais';
    }
}

async function checkAPIStatusAdmin() {
    const badge = document.getElementById('apiStatusAdmin');
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            badge.className = 'badge badge-success';
            badge.innerHTML = '<i class="fas fa-plug"></i> API: ONLINE';
            badge.title = `Banco: ${data.database || 'Conectado'}`;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.log('API offline, usando modo local');
        badge.className = 'badge badge-warning';
        badge.innerHTML = '<i class="fas fa-plug"></i> API: OFFLINE';
        badge.title = 'Usando dados locais';
    }
}

// ... (restante do código permanece igual) ...

// ==============================
// INICIALIZAÇÃO
// ==============================
document.addEventListener('DOMContentLoaded', function() {
    // Carregar configurações salvas
    loadSavedSettings();
    
    // Configurar evento do seletor de cor
    const colorPicker = document.getElementById('courseColor');
    const colorHex = document.getElementById('courseColorHex');
    
    if (colorPicker && colorHex) {
        colorPicker.addEventListener('input', function() {
            colorHex.value = this.value;
        });
        
        colorHex.addEventListener('input', function() {
            if (this.value.match(/^#[0-9A-F]{6}$/i)) {
                colorPicker.value = this.value;
            }
        });
    }
    
    // Configurar slider de temperatura
    const tempRange = document.getElementById('tempRange');
    const tempValue = document.getElementById('tempValue');
    
    if (tempRange && tempValue) {
        tempRange.addEventListener('input', function() {
            tempValue.textContent = this.value;
        });
    }
    
    // Adicionar evento Enter no login
    document.getElementById('adminPass')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginAsAdmin();
        }
    });
    
    document.getElementById('username')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginAsUser();
        }
    });
});
