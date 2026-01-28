// js/script.js - Sistema completo com integração de login

// ==============================
// CONFIGURAÇÕES GLOBAIS
// ==============================
const CONFIG = {
    OPENROUTER_API_KEY: "sk-or-v1-6f9f8e8e9f0e1f2f3f4f5f6f7f8f9f0f1f2f3f4f5f6f7f8f9f0f1f2f3f4f5f",
    OPENROUTER_URL: "https://openrouter.ai/api/v1/chat/completions",
    DEFAULT_MODEL: "meta-llama/llama-3.1-70b-instruct:free",
    ADMIN_USER: "admin",
    ADMIN_PASS: "admin123",
    USER_PASS: "user123" // Senha padrão para usuário
};

// Estado do sistema
let currentUser = null;
let isAdmin = false;
let currentPage = 'dashboard';
let selectedCourse = null;
let chatMessages = [];

// Dados de exemplo
const SAMPLE_COURSES = [
    {
        id: 1,
        nome: "Medicina",
        descricao: "Formação completa em medicina com especializações",
        duracao: "6 anos",
        vagas: 120,
        investimento: "R$ 8.500/mês",
        tags: ["Saúde", "Presencial", "Integral"],
        cor: "#ef4444"
    },
    {
        id: 2,
        nome: "Engenharia Civil",
        descricao: "Projetos, construção e manutenção de estruturas",
        duracao: "5 anos",
        vagas: 200,
        investimento: "R$ 1.800/mês",
        tags: ["Exatas", "Presencial", "Noturno"],
        cor: "#3b82f6"
    },
    {
        id: 3,
        nome: "Direito",
        descricao: "Formação jurídica completa com prática forense",
        duracao: "5 anos",
        vagas: 180,
        investimento: "R$ 1.600/mês",
        tags: ["Humanas", "Híbrido", "Noturno"],
        cor: "#10b981"
    },
    {
        id: 4,
        nome: "Administração",
        descricao: "Gestão empresarial e liderança organizacional",
        duracao: "4 anos",
        vagas: 250,
        investimento: "R$ 1.200/mês",
        tags: ["Negócios", "EAD", "Flexível"],
        cor: "#f59e0b"
    },
    {
        id: 5,
        nome: "Ciência da Computação",
        descricao: "Desenvolvimento de software e inteligência artificial",
        duracao: "4 anos",
        vagas: 150,
        investimento: "R$ 1.900/mês",
        tags: ["Tecnologia", "Presencial", "Integral"],
        cor: "#8b5cf6"
    },
    {
        id: 6,
        nome: "Psicologia",
        descricao: "Formação em saúde mental e comportamento humano",
        duracao: "5 anos",
        vagas: 100,
        investimento: "R$ 1.500/mês",
        tags: ["Saúde", "Presencial", "Noturno"],
        cor: "#ec4899"
    }
];

// ==============================
// FUNÇÕES DE LOGIN (INTEGRADO COM O SEU MODELO)
// ==============================

// Função para mostrar notificações
function showNotification(message, type = 'success') {
    // Remover notificações anteriores
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Estilos da notificação
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
    `;
    
    // Adicionar estilos CSS para animação
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Função para mostrar/ocultar abas
function showTab(tabId, element) {
    // Remove classe active de todas as tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Esconde todos os conteúdos
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // Ativa tab selecionada
    element.classList.add('active');
    document.getElementById(tabId + 'Tab').style.display = 'block';
}

// Login como usuário
function loginAsUser() {
    const username = document.getElementById('username').value.trim() || 'Visitante';
    const password = document.getElementById('userPass').value.trim();
    
    // Validação de senha
    if (password !== CONFIG.USER_PASS) {
        showNotification(`Senha incorreta! Use a senha: ${CONFIG.USER_PASS}`, 'error');
        return;
    }
    
    currentUser = {
        id: Date.now(),
        name: username,
        username: username.toLowerCase(),
        role: 'user',
        avatar: username.charAt(0).toUpperCase(),
        email: `${username.toLowerCase()}@exemplo.com`
    };
    
    isAdmin = false;
    
    // Salvar no localStorage (mantendo compatibilidade com seu modelo)
    localStorage.setItem('assistance_logged_user', JSON.stringify(currentUser));
    localStorage.setItem('currentUser', username);
    localStorage.setItem('userRole', 'user');
    localStorage.setItem('lastLogin', new Date().toISOString());
    
    // Registrar usuário ativo
    const userData = {
        username: username,
        role: 'user',
        lastActive: new Date().toISOString(),
        loginTime: new Date().toLocaleString('pt-BR')
    };
    
    let users = JSON.parse(localStorage.getItem('activeUsers') || '[]');
    users = users.filter(u => u.username !== username);
    users.push(userData);
    localStorage.setItem('activeUsers', JSON.stringify(users));
    
    showNotification(`Bem-vindo, ${username}!`, 'success');
    
    // Iniciar aplicação
    startApp();
}

// Login como admin
function loginAsAdmin() {
    const username = document.getElementById('adminUser').value.trim();
    const password = document.getElementById('adminPass').value.trim();
    
    if (!username || !password) {
        showNotification('Preencha todos os campos', 'error');
        return;
    }
    
    // Verificar credenciais
    const validAdmins = [
        { user: 'admin', pass: 'admin123' },
        { user: 'suporte', pass: 'suporte123' },
        { user: 'administrador', pass: 'admin123' }
    ];
    
    const isValid = validAdmins.some(admin => 
        admin.user === username && admin.pass === password
    );
    
    if (isValid) {
        currentUser = {
            id: Date.now(),
            name: username,
            username: username.toLowerCase(),
            role: 'admin',
            avatar: 'A',
            email: `${username.toLowerCase()}@admin.com`
        };
        
        isAdmin = true;
        
        // Salvar no localStorage
        localStorage.setItem('assistance_logged_user', JSON.stringify(currentUser));
        localStorage.setItem('currentUser', username);
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('adminLoggedIn', 'true');
        
        // Registrar login admin
        const loginRecord = {
            username: username,
            role: 'admin',
            timestamp: new Date().toISOString(),
            action: 'login',
            ip: 'local'
        };
        
        let adminLogs = JSON.parse(localStorage.getItem('adminLogs') || '[]');
        adminLogs.push(loginRecord);
        localStorage.setItem('adminLogs', JSON.stringify(adminLogs));
        
        showNotification(`Bem-vindo, Admin ${username}!`, 'success');
        
        // Iniciar aplicação
        startApp();
    } else {
        showNotification('Credenciais inválidas! Tente admin/admin123', 'error');
    }
}

// ==============================
// INICIALIZAÇÃO DO APP
// ==============================
function startApp() {
    // Esconde login, mostra app
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    
    // Atualiza informações do usuário
    updateUserInfo();
    
    // Verifica status da API
    checkAPIStatus();
    
    // Carrega dashboard
    loadDashboard();
    
    // Carrega cursos
    loadCourses();
    
    // Configura navegação
    setupNavigation();
    
    // Configura eventos do chat
    setupChatEvents();
    
    // Verificar se é admin e carregar páginas específicas
    if (isAdmin) {
        loadAdminFeatures();
    }
}

function updateUserInfo() {
    if (!currentUser) return;
    
    document.getElementById('userAvatar').textContent = currentUser.avatar;
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = isAdmin ? 'Administrador' : 'Usuário';
    document.getElementById('userFullName').textContent = currentUser.name;
    document.getElementById('welcomeMessage').innerHTML = 
        `Bem-vindo de volta, <strong>${currentUser.name}</strong>!`;
    
    // Mostra/oculta itens admin
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? 'flex' : 'none';
    });
}

// ==============================
// FUNÇÕES DA API
// ==============================
async function checkAPIStatus() {
    const badge = document.getElementById('apiStatusBadge');
    
    try {
        // Teste simples de conexão com a API
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${CONFIG.OPENROUTER_API_KEY}`
            }
        });
        
        if (response.ok) {
            badge.className = 'badge badge-success';
            badge.innerHTML = '<i class="fas fa-plug"></i> API: ONLINE';
            badge.title = 'Conexão com OpenRouter ativa';
        } else {
            throw new Error('API não respondeu');
        }
    } catch (error) {
        console.warn('API offline, usando modo simulador:', error);
        badge.className = 'badge badge-danger';
        badge.innerHTML = '<i class="fas fa-plug"></i> API: OFFLINE (MODO SIMULAÇÃO)';
        badge.title = 'Usando respostas simuladas localmente';
    }
}

// ==============================
// DASHBOARD
// ==============================
function loadDashboard() {
    const statsContainer = document.getElementById('dashboardStats');
    
    // Buscar dados do localStorage
    const activeUsers = JSON.parse(localStorage.getItem('activeUsers') || '[]');
    const adminLogs = JSON.parse(localStorage.getItem('adminLogs') || '[]');
    const feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
    
    const stats = [
        {
            icon: 'fas fa-users',
            title: 'Usuários Ativos',
            value: activeUsers.length.toString(),
            trend: '+12%',
            trendUp: true,
            color: 'var(--primary)'
        },
        {
            icon: 'fas fa-graduation-cap',
            title: 'Cursos Ativos',
            value: SAMPLE_COURSES.length.toString(),
            trend: '+3',
            trendUp: true,
            color: 'var(--success)'
        },
        {
            icon: 'fas fa-comments',
            title: 'Interações IA',
            value: chatMessages.length.toString(),
            trend: '+28%',
            trendUp: true,
            color: 'var(--info)'
        },
        {
            icon: 'fas fa-chart-line',
            title: 'Conversão',
            value: '34%',
            trend: '+5%',
            trendUp: true,
            color: 'var(--warning)'
        }
    ];
    
    statsContainer.innerHTML = stats.map(stat => `
        <div class="stat-card">
            <i class="${stat.icon}" style="color: ${stat.color}"></i>
            <h3>${stat.title}</h3>
            <div class="value">${stat.value}</div>
            <div class="trend ${stat.trendUp ? 'up' : 'down'}">
                <i class="fas fa-arrow-${stat.trendUp ? 'up' : 'down'}"></i>
                ${stat.trend}
            </div>
        </div>
    `).join('');
    
    // Atualiza atividades recentes
    setTimeout(() => {
        const activitiesContainer = document.querySelector('#dashboardPage .admin-section:last-child p');
        const recentActivities = [
            {
                icon: 'fa-comment',
                color: 'primary',
                title: 'Novo login realizado',
                description: `${currentUser.name} acessou o sistema`,
                time: 'Agora mesmo'
            },
            ...activeUsers.slice(0, 3).map(user => ({
                icon: 'fa-user',
                color: 'success',
                title: 'Usuário ativo',
                description: `${user.username} online`,
                time: user.loginTime || 'Recentemente'
            })),
            ...adminLogs.slice(0, 2).map(log => ({
                icon: 'fa-shield-alt',
                color: 'warning',
                title: 'Ação administrativa',
                description: `${log.username} ${log.action}`,
                time: new Date(log.timestamp).toLocaleTimeString('pt-BR')
            }))
        ];
        
        activitiesContainer.innerHTML = `
            <div class="activity-list">
                ${recentActivities.map(activity => `
                    <div class="activity-item">
                        <i class="fas ${activity.icon} text-${activity.color}"></i>
                        <div>
                            <strong>${activity.title}</strong>
                            <p>${activity.description}</p>
                            <small>${activity.time}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }, 1000);
}

// ==============================
// GESTÃO DE CURSOS
// ==============================
function loadCourses() {
    const container = document.getElementById('cursosContainer');
    
    container.innerHTML = SAMPLE_COURSES.map(course => `
        <div class="curso-item" data-course-id="${course.id}" onclick="selectCourse(${course.id})">
            <h4 style="color: ${course.cor}">${course.nome}</h4>
            <p>${course.descricao}</p>
            <div class="curso-tags">
                ${course.tags.map(tag => `<span class="curso-tag">${tag}</span>`).join('')}
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 12px;">
                <small><i class="fas fa-clock"></i> ${course.duracao}</small>
                <small><i class="fas fa-users"></i> ${course.vagas} vagas</small>
            </div>
        </div>
    `).join('');
}

function selectCourse(courseId) {
    // Remove active de todos os cursos
    document.querySelectorAll('.curso-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Adiciona active ao curso selecionado
    const cursoItem = document.querySelector(`[data-course-id="${courseId}"]`);
    if (cursoItem) {
        cursoItem.classList.add('active');
    }
    
    // Define curso atual
    selectedCourse = SAMPLE_COURSES.find(c => c.id === courseId);
    
    // Atualiza header do chat
    const currentCourseEl = document.getElementById('currentCourse');
    currentCourseEl.innerHTML = `
        <i class="fas fa-book" style="color: ${selectedCourse.cor}"></i>
        <span>Curso selecionado: <strong>${selectedCourse.nome}</strong></span>
    `;
    
    // Adiciona mensagem inicial sobre o curso
    addMessage('assistant', `Ótima escolha! Você selecionou o curso de <strong>${selectedCourse.nome}</strong>.<br><br>
        <strong>Informações do curso:</strong><br>
        • Duração: ${selectedCourse.duracao}<br>
        • Vagas disponíveis: ${selectedCourse.vagas}<br>
        • Investimento: ${selectedCourse.investimento}<br>
        • Modalidade: ${selectedCourse.tags.join(', ')}<br><br>
        Como posso ajudar com esse curso? Posso fornecer:<br>
        1. Scripts de vendas<br>
        2. Argumentos para objeções<br>
        3. Diferenciais competitivos<br>
        4. Informações de mercado`);
    
    // Atualiza ações rápidas
    updateQuickActions();
}

// ==============================
// NAVEGAÇÃO
// ==============================
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            // Remove active de todos os itens
            document.querySelectorAll('.nav-item').forEach(i => {
                i.classList.remove('active');
            });
            
            // Adiciona active ao item clicado
            this.classList.add('active');
            
            // Navega para a página
            const page = this.getAttribute('data-page');
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    // Esconde todas as páginas
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    // Mostra a página selecionada
    const pageElement = document.getElementById(page + 'Page');
    if (pageElement) {
        pageElement.classList.add('active');
        currentPage = page;
        
        // Carrega conteúdo específico
        switch(page) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'ia':
                // Já está carregado
                break;
            case 'feedback':
                loadFeedbackPage();
                break;
            case 'courses':
                if (isAdmin) loadCoursesPage();
                break;
            case 'admin':
                if (isAdmin) loadAdminPage();
                break;
            case 'settings':
                loadSettingsPage();
                break;
            case 'about':
                loadAboutPage();
                break;
        }
    }
}

// ==============================
// CHAT IA
// ==============================
function setupChatEvents() {
    const textarea = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    
    if (!textarea || !sendButton) return;
    
    // Auto-expand textarea
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Send on Enter (without Shift)
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Send button click
    sendButton.addEventListener('click', sendMessage);
}

function updateQuickActions() {
    const container = document.getElementById('quickActions');
    
    if (!selectedCourse) {
        container.innerHTML = `
            <button class="quick-action-btn" onclick="quickAction('courses')">
                <i class="fas fa-graduation-cap"></i> Ver todos os cursos
            </button>
        `;
        return;
    }
    
    const actions = [
        {
            icon: 'fas fa-comments',
            text: 'Script de vendas',
            action: 'sales_script'
        },
        {
            icon: 'fas fa-question-circle',
            text: 'Objeções comuns',
            action: 'objections'
        },
        {
            icon: 'fas fa-chart-bar',
            text: 'Mercado de trabalho',
            action: 'market'
        },
        {
            icon: 'fas fa-star',
            text: 'Diferenciais do curso',
            action: 'differentiators'
        },
        {
            icon: 'fas fa-graduation-cap',
            text: 'Grade curricular',
            action: 'curriculum'
        }
    ];
    
    container.innerHTML = actions.map(action => `
        <button class="quick-action-btn" onclick="quickAction('${action.action}')">
            <i class="${action.icon}"></i> ${action.text}
        </button>
    `).join('');
}

function addMessage(sender, content) {
    const container = document.getElementById('messagesContainer');
    
    // Remove indicador de digitação se existir
    removeTypingIndicator();
    
    // Adiciona nova mensagem
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.innerHTML = `
        <div class="message-header">
            <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
            ${sender === 'user' ? currentUser.name : 'Assistente IA'}
        </div>
        <div class="message-content">${content}</div>
    `;
    
    container.appendChild(messageDiv);
    
    // Salva mensagem no histórico
    chatMessages.push({ sender, content, timestamp: new Date().toISOString() });
    
    // Scroll para o final
    container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
    const container = document.getElementById('messagesContainer');
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-header">
            <i class="fas fa-robot"></i>
            Assistente IA
        </div>
        <div class="message-content">
            <div class="typing">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// ==============================
// FUNÇÕES DO CHAT
// ==============================
async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (!message) {
        showNotification('Digite uma mensagem', 'error');
        return;
    }
    
    if (!selectedCourse) {
        showNotification('Selecione um curso primeiro!', 'warning');
        return;
    }
    
    // Limpa input
    input.value = '';
    input.style.height = 'auto';
    
    // Adiciona mensagem do usuário
    addMessage('user', message);
    
    // Mostra indicador de digitação
    showTypingIndicator();
    
    try {
        // Se estiver em modo simulação ou API offline
        const apiBadge = document.getElementById('apiStatusBadge');
        const isAPIOffline = apiBadge.textContent.includes('OFFLINE');
        
        if (isAPIOffline) {
            // Modo simulação
            setTimeout(() => {
                removeTypingIndicator();
                const response = generateSimulatedResponse(message);
                addMessage('assistant', response);
            }, 1500);
        } else {
            // Usa API real
            const response = await callOpenRouterAPI(message);
            removeTypingIndicator();
            addMessage('assistant', response);
        }
        
        // Registrar interação
        const interaction = {
            user: currentUser.username,
            course: selectedCourse.nome,
            message: message,
            timestamp: new Date().toISOString(),
            responseType: isAPIOffline ? 'simulated' : 'api'
        };
        
        let interactions = JSON.parse(localStorage.getItem('chatInteractions') || '[]');
        interactions.push(interaction);
        localStorage.setItem('chatInteractions', JSON.stringify(interactions));
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        removeTypingIndicator();
        addMessage('assistant', `Desculpe, tive um problema ao processar sua solicitação. 
            <br><br><strong>Erro:</strong> ${error.message}
            <br><br>Por favor, tente novamente ou use as ações rápidas abaixo.`);
    }
}

function generateSimulatedResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (!selectedCourse) {
        return `Por favor, selecione um curso na lista à esquerda para que eu possa fornecer informações específicas.`;
    }
    
    // Respostas simuladas baseadas no tipo de pergunta
    if (lowerMessage.includes('script') || lowerMessage.includes('venda')) {
        return `<strong>📋 SCRIPT DE VENDAS - ${selectedCourse.nome.toUpperCase()}</strong><br><br>
        1. <strong>Abertura:</strong> "Olá, você está considerando uma graduação em ${selectedCourse.nome}? Excelente escolha!"<br><br>
        2. <strong>Proposta de valor:</strong> "Nosso curso oferece ${selectedCourse.descricao.toLowerCase()} com duração de ${selectedCourse.duracao}"<br><br>
        3. <strong>Diferenciais:</strong> "Temos apenas ${selectedCourse.vagas} vagas para garantir qualidade no ensino"<br><br>
        4. <strong>Fechamento:</strong> "Por apenas ${selectedCourse.investimento}, você investe no seu futuro profissional!"<br><br>
        <em>Dica:</em> Adapte esse script para o perfil de cada lead.`;
    }
    
    if (lowerMessage.includes('objeç') || lowerMessage.includes('dúvida') || lowerMessage.includes('caro')) {
        return `<strong>💡 RESPOSTAS PARA OBJEÇÕES - ${selectedCourse.nome.toUpperCase()}</strong><br><br>
        <strong>Objeção:</strong> "É muito caro"<br>
        <strong>Resposta:</strong> "O investimento de ${selectedCourse.investimento} é um valor que se paga rapidamente após a formação. Em ${selectedCourse.nome}, o retorno financeiro é garantido!"<br><br>
        
        <strong>Objeção:</strong> "Demora muito"<br>
        <strong>Resposta:</strong> "Os ${selectedCourse.duracao} são necessários para uma formação completa e qualificada. Cada semestre traz conhecimento essencial para sua carreira."<br><br>
        
        <strong>Objeção:</strong> "Não sei se é para mim"<br>
        <strong>Resposta:</strong> "Oferecemos uma aula experimental gratuita para você sentir o ambiente e conhecer nossos professores."`;
    }
    
    if (lowerMessage.includes('mercado') || lowerMessage.includes('trabalho') || lowerMessage.includes('salário')) {
        return `<strong>📊 MERCADO DE TRABALHO - ${selectedCourse.nome.toUpperCase()}</strong><br><br>
        <strong>Oportunidades:</strong><br>
        • Alta demanda no mercado<br>
        • Média salarial inicial: R$ 4.500 - R$ 8.000<br>
        • Taxa de empregabilidade: 92% em 6 meses<br>
        • Setores em crescimento: Tecnologia, Saúde, Construção Civil<br><br>
        
        <strong>Tendências:</strong><br>
        • Crescimento de 15% ao ano na área<br>
        • Novas especializações em alta<br>
        • Expansão para o mercado internacional`;
    }
    
    if (lowerMessage.includes('grade') || lowerMessage.includes('matérias') || lowerMessage.includes('disciplinas')) {
        return `<strong>📚 GRADE CURRICULAR - ${selectedCourse.nome.toUpperCase()}</strong><br><br>
        <strong>1º ao 4º semestre:</strong><br>
        • Fundamentos da área<br>
        • Bases teóricas essenciais<br>
        • Introdução à prática profissional<br><br>
        
        <strong>5º ao 8º semestre:</strong><br>
        • Especializações específicas<br>
        • Projetos integradores<br>
        • Estágios supervisionados<br><br>
        
        <strong>Últimos semestres:</strong><br>
        • Trabalho de conclusão de curso<br>
        • Optativas de aprofundamento<br>
        • Preparação para o mercado`;
    }
    
    // Resposta padrão
    return `Entendi sua pergunta sobre "${message}". Em relação ao curso de <strong>${selectedCourse.nome}</strong>, posso dizer que:<br><br>
    1. É uma excelente opção de carreira com ótimas perspectivas<br>
    2. O investimento de ${selectedCourse.investimento} tem ótimo custo-benefício<br>
    3. A duração de ${selectedCourse.duracao} garante uma formação completa<br><br>
    <strong>Gostaria de informações mais específicas sobre:</strong><br>
    • Scripts de vendas<br>
    • Mercado de trabalho<br>
    • Grade curricular<br>
    • Respostas para objeções<br><br>
    Use os botões de ações rápidas ou me faça outra pergunta!`;
}

async function callOpenRouterAPI(message) {
    try {
        const response = await fetch(CONFIG.OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Assistance SM'
            },
            body: JSON.stringify({
                model: CONFIG.DEFAULT_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `Você é um assistente de vendas especializado em cursos universitários. 
                        Curso atual: ${selectedCourse.nome} - ${selectedCourse.descricao}
                        Duração: ${selectedCourse.duracao}, Investimento: ${selectedCourse.investimento}
                        Forneça respostas úteis, focadas em vendas, com informações precisas e motivacionais.
                        Use formatação HTML básica como <strong>, <br>, <ul>, <li> quando apropriado.`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Erro na chamada da API:', error);
        // Fallback para resposta simulada
        return generateSimulatedResponse(message);
    }
}

function quickAction(action) {
    const actions = {
        'sales_script': `📋 <strong>SCRIPT DE VENDAS COMPLETO PARA ${selectedCourse.nome.toUpperCase()}</strong><br><br>
        1. <strong>CONTATO INICIAL (30s):</strong><br>
        "Olá [Nome], tudo bem? Vi seu interesse em ${selectedCourse.nome}. É uma área fantástica que está em alta!"<br><br>
        
        2. <strong>APRESENTAÇÃO DO CURSO (1min):</strong><br>
        "Nosso curso tem ${selectedCourse.duracao} de duração e foca em ${selectedCourse.descricao.toLowerCase()}. 
        São apenas ${selectedCourse.vagas} vagas por turma para garantir atenção personalizada."<br><br>
        
        3. <strong>PROPOSTA DE VALOR (45s):</strong><br>
        "Por ${selectedCourse.investimento}, você recebe: aulas com profissionais atuantes, laboratórios modernos, 
        estágios garantidos e network com ex-alunos bem-sucedidos."<br><br>
        
        4. <strong>CHAMADA PARA AÇÃO (15s):</strong><br>
        "Posso agendar uma visita para você conhecer nossa estrutura? Temos vagas limitadas!"`,
        
        'objections': `💡 <strong>OBJEÇÕES MAIS COMUNS - ${selectedCourse.nome.toUpperCase()}</strong><br><br>
        <strong>"É muito caro!"</strong><br>
        • "O valor se paga em 6 meses de trabalho na área"<br>
        • "Oferecemos 12 formas de parcelamento"<br>
        • "Temos bolsas de estudo de até 50%"<br><br>
        
        <strong>"Demora muito!"</strong><br>
        • "Cada semestre traz conhecimento prático"<br>
        • "Você já começa a estagiar no 2º ano"<br>
        • "Temos cursos de extensão paralelos"<br><br>
        
        <strong>"Não tenho tempo!"</strong><br>
        • "Temos turmas matutinas, vespertinas e noturnas"<br>
        • "Disponível também no formato EaD"<br>
        • "Flexibilidade total de horários"`,
        
        'market': `📊 <strong>MERCADO DE TRABALHO - ${selectedCourse.nome.toUpperCase()}</strong><br><br>
        <strong>Dados do LinkedIn 2024:</strong><br>
        • 25.000 vagas abertas na área<br>
        • Salário médio inicial: R$ 5.200<br>
        • Crescimento anual: 18%<br><br>
        
        <strong>Áreas de atuação:</strong><br>
        • Empresas privadas (65%)<br>
        • Serviço público (20%)<br>
        • Empreendedorismo (15%)<br><br>
        
        <strong>Tendências para 2025:</strong><br>
        • Digitalização da área (+40%)<br>
        • Especializações em IA (+35%)<br>
        • Trabalho remoto (+25%)`,
        
        'differentiators': `⭐ <strong>DIFERENCIAIS - ${selectedCourse.nome.toUpperCase()}</strong><br><br>
        <strong>Infraestrutura:</strong><br>
        • Laboratórios de última geração<br>
        • Biblioteca digital 24h<br>
        • Espaços colaborativos<br><br>
        
        <strong>Corpo docente:</strong><br>
        • 95% mestres ou doutores<br>
        • Profissionais atuantes no mercado<br>
        • Professores internacionais<br><br>
        
        <strong>Diferenciais exclusivos:</strong><br>
        • Programa de mentoria<br>
        • Feira de empregabilidade anual<br>
        • Parcerias com empresas líderes`,
        
        'curriculum': `📚 <strong>GRADE CURRICULAR DETALHADA - ${selectedCourse.nome.toUpperCase()}</strong><br><br>
        <strong>1º e 2º Ano (Ciclo Básico):</strong><br>
        • Fundamentos da profissão<br>
        • Teorias essenciais<br>
        • Métodos de pesquisa<br>
        • Ética profissional<br><br>
        
        <strong>3º e 4º Ano (Ciclo de Aprofundamento):</strong><br>
        • Especializações específicas<br>
        • Estágios supervisionados<br>
        • Projetos interdisciplinares<br>
        • Optativas de interesse<br><br>
        
        <strong>5º e 6º Ano (Ciclo de Especialização):</strong><br>
        • TCC/Trabalho de conclusão<br>
        • Estágio profissional<br>
        • Disciplinas eletivas<br>
        • Preparação para o mercado`
    };
    
    const response = actions[action] || `Ação "${action}" não reconhecida.`;
    addMessage('assistant', response);
}

// ==============================
// PÁGINAS ADICIONAIS
// ==============================
function loadFeedbackPage() {
    const container = document.getElementById('feedbackPage');
    const feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
    
    container.innerHTML = `
        <div class="admin-section">
            <h2 class="section-title">
                <i class="fas fa-comment-dots"></i> Feedback dos Usuários
            </h2>
            
            <div class="feedback-container">
                <div class="feedback-form-container">
                    <h3><i class="fas fa-edit"></i> Deixe seu Feedback</h3>
                    <div class="rating-stars" id="ratingStars">
                        ${[1,2,3,4,5].map(star => `
                            <i class="fas fa-star star" data-rating="${star}" onclick="setRating(${star})"></i>
                        `).join('')}
                    </div>
                    <div class="form-group">
                        <label>Comentário</label>
                        <textarea id="feedbackComment" class="form-control" rows="4" 
                                  placeholder="Compartilhe sua experiência com o sistema..."></textarea>
                    </div>
                    <button class="btn btn-primary mt-3" onclick="submitFeedback()">
                        <i class="fas fa-paper-plane"></i> Enviar Feedback
                    </button>
                </div>
                
                <div class="feedback-stats">
                    <h3><i class="fas fa-chart-bar"></i> Estatísticas</h3>
                    <div class="mt-4">
                        <h4>Feedback Recentes</h4>
                        ${feedbacks.slice(0, 5).map(feedback => `
                            <div class="feedback-item mt-3">
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>${feedback.user || 'Usuário'}</strong>
                                    <div>
                                        ${Array(feedback.rating).fill().map(() => 
                                            '<i class="fas fa-star text-warning"></i>'
                                        ).join('')}
                                    </div>
                                </div>
                                <p class="mt-1">${feedback.comment}</p>
                                <small style="color: var(--secondary);">${new Date(feedback.timestamp).toLocaleDateString('pt-BR')}</small>
                            </div>
                        `).join('') || '<p>Nenhum feedback ainda. Seja o primeiro!</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setRating(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function submitFeedback() {
    const stars = document.querySelectorAll('.star.active');
    const rating = stars.length;
    const comment = document.getElementById('feedbackComment').value.trim();
    
    if (rating === 0 || !comment) {
        showNotification('Por favor, selecione uma avaliação e escreva um comentário', 'error');
        return;
    }
    
    const feedback = {
        user: currentUser.name,
        rating: rating,
        comment: comment,
        timestamp: new Date().toISOString(),
        role: currentUser.role
    };
    
    let feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
    feedbacks.unshift(feedback); // Adiciona no início
    localStorage.setItem('feedbacks', JSON.stringify(feedbacks));
    
    showNotification('Feedback enviado com sucesso! Obrigado!', 'success');
    
    // Limpar formulário
    document.querySelectorAll('.star').forEach(star => star.classList.remove('active'));
    document.getElementById('feedbackComment').value = '';
    
    // Recarregar página de feedback
    setTimeout(() => loadFeedbackPage(), 500);
}

function loadCoursesPage() {
    const container = document.getElementById('coursesPage');
    
    container.innerHTML = `
        <div class="admin-section">
            <h2 class="section-title">
                <i class="fas fa-book"></i> Gestão de Cursos
            </h2>
            
            <div style="margin-bottom: 24px;">
                <button class="btn btn-success" onclick="showAddCourseModal()">
                    <i class="fas fa-plus"></i> Adicionar Novo Curso
                </button>
            </div>
            
            <div class="table-responsive">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Curso</th>
                            <th>Duração</th>
                            <th>Vagas</th>
                            <th>Investimento</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${SAMPLE_COURSES.map(course => `
                            <tr>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${course.cor};"></div>
                                        <strong>${course.nome}</strong>
                                    </div>
                                    <small style="color: var(--secondary);">${course.descricao.substring(0, 50)}...</small>
                                </td>
                                <td>${course.duracao}</td>
                                <td>${course.vagas}</td>
                                <td>${course.investimento}</td>
                                <td>
                                    <button class="btn btn-sm btn-primary" onclick="editCourse(${course.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function loadAdminPage() {
    const container = document.getElementById('adminPage');
    const activeUsers = JSON.parse(localStorage.getItem('activeUsers') || '[]');
    const adminLogs = JSON.parse(localStorage.getItem('adminLogs') || '[]');
    const chatInteractions = JSON.parse(localStorage.getItem('chatInteractions') || '[]');
    
    container.innerHTML = `
        <div class="admin-section">
            <h2 class="section-title">
                <i class="fas fa-chart-line"></i> Painel Administrativo
            </h2>
            
            <div class="admin-stats">
                <div class="stat-card">
                    <i class="fas fa-users" style="color: var(--primary)"></i>
                    <h3>Usuários Ativos</h3>
                    <div class="value">${activeUsers.length}</div>
                    <div class="trend up">
                        <i class="fas fa-arrow-up"></i> Hoje
                    </div>
                </div>
                
                <div class="stat-card">
                    <i class="fas fa-comments" style="color: var(--info)"></i>
                    <h3>Interações</h3>
                    <div class="value">${chatInteractions.length}</div>
                    <div class="trend up">
                        <i class="fas fa-arrow-up"></i> +28%
                    </div>
                </div>
                
                <div class="stat-card">
                    <i class="fas fa-star" style="color: var(--warning)"></i>
                    <h3>Feedbacks</h3>
                    <div class="value">${JSON.parse(localStorage.getItem('feedbacks') || '[]').length}</div>
                    <div class="trend up">
                        <i class="fas fa-arrow-up"></i> +12
                    </div>
                </div>
                
                <div class="stat-card">
                    <i class="fas fa-shield-alt" style="color: var(--danger)"></i>
                    <h3>Logs Admin</h3>
                    <div class="value">${adminLogs.length}</div>
                    <div class="trend up">
                        <i class="fas fa-arrow-up"></i> Recente
                    </div>
                </div>
            </div>
            
            <div class="admin-grid">
                <div class="admin-card">
                    <h3><i class="fas fa-user-clock"></i> Usuários Ativos Recentes</h3>
                    <div class="mt-3">
                        ${activeUsers.slice(0, 5).map(user => `
                            <div style="padding: 10px; border-bottom: 1px solid var(--border);">
                                <strong>${user.username}</strong>
                                <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--secondary);">
                                    <span>${user.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
                                    <span>${user.lastActive ? new Date(user.lastActive).toLocaleTimeString('pt-BR') : ''}</span>
                                </div>
                            </div>
                        `).join('') || '<p>Nenhum usuário ativo</p>'}
                    </div>
                </div>
                
                <div class="admin-card">
                    <h3><i class="fas fa-history"></i> Logs do Sistema</h3>
                    <div class="mt-3" style="max-height: 300px; overflow-y: auto;">
                        ${adminLogs.slice(0, 10).map(log => `
                            <div style="padding: 8px; border-bottom: 1px solid var(--border); font-size: 13px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>${log.username}</strong>
                                    <small>${new Date(log.timestamp).toLocaleTimeString('pt-BR')}</small>
                                </div>
                                <div style="color: var(--secondary);">${log.action}</div>
                            </div>
                        `).join('') || '<p>Nenhum log disponível</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function loadSettingsPage() {
    const container = document.getElementById('settingsPage');
    
    container.innerHTML = `
        <div class="admin-section">
            <h2 class="section-title">
                <i class="fas fa-cog"></i> Configurações do Sistema
            </h2>
            
            <div class="settings-grid">
                <div class="settings-card">
                    <h3><i class="fas fa-user-cog"></i> Perfil do Usuário</h3>
                    <div class="mt-3">
                        <div class="form-group">
                            <label>Nome</label>
                            <input type="text" class="form-control" value="${currentUser.name}" disabled>
                        </div>
                        <div class="form-group">
                            <label>Função</label>
                            <input type="text" class="form-control" value="${isAdmin ? 'Administrador' : 'Usuário'}" disabled>
                        </div>
                        <button class="btn btn-primary mt-2" onclick="changeUserAvatar()">
                            <i class="fas fa-user-edit"></i> Alterar Avatar
                        </button>
                    </div>
                </div>
                
                <div class="settings-card">
                    <h3><i class="fas fa-robot"></i> Configurações de IA</h3>
                    <div class="mt-3">
                        <div class="form-group">
                            <label>Modelo de IA</label>
                            <select class="form-control" id="aiModel">
                                <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (Gratuito)</option>
                                <option value="meta-llama/llama-3.1-70b-instruct:free">Llama 3.1 70B (Gratuito)</option>
                                <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                <option value="openai/gpt-4">GPT-4</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Temperatura: <span id="tempValue">0.7</span></label>
                            <input type="range" id="tempRange" class="form-control" min="0" max="1" step="0.1" value="0.7">
                        </div>
                        <button class="btn btn-success mt-2" onclick="saveAISettings()">
                            <i class="fas fa-save"></i> Salvar Configurações
                        </button>
                    </div>
                </div>
                
                <div class="settings-card">
                    <h3><i class="fas fa-database"></i> Gerenciamento de Dados</h3>
                    <div class="mt-3">
                        <button class="btn btn-warning mb-2" onclick="clearLocalData()" style="width: 100%;">
                            <i class="fas fa-trash"></i> Limpar Dados Locais
                        </button>
                        <button class="btn btn-info mb-2" onclick="exportData()" style="width: 100%;">
                            <i class="fas fa-download"></i> Exportar Dados
                        </button>
                        <button class="btn btn-secondary" onclick="resetSystem()" style="width: 100%;">
                            <i class="fas fa-redo"></i> Reiniciar Sistema
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Configurar slider de temperatura
    const tempRange = document.getElementById('tempRange');
    const tempValue = document.getElementById('tempValue');
    if (tempRange && tempValue) {
        tempRange.addEventListener('input', (e) => {
            tempValue.textContent = e.target.value;
        });
    }
}

function loadAboutPage() {
    const container = document.getElementById('aboutPage');
    
    container.innerHTML = `
        <div class="admin-section">
            <h2 class="section-title">
                <i class="fas fa-info-circle"></i> Sobre o Sistema
            </h2>
            
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 72px; color: var(--primary); margin-bottom: 20px;">
                    <i class="fas fa-brain"></i>
                </div>
                
                <h1 style="font-size: 36px; margin-bottom: 10px; color: var(--dark);">
                    Assistance SM v4.0
                </h1>
                
                <p style="font-size: 18px; color: var(--secondary); margin-bottom: 30px;">
                    Sistema Inteligente de Gestão Educacional com IA
                </p>
                
                <div style="max-width: 600px; margin: 0 auto; text-align: left;">
                    <h3><i class="fas fa-star"></i> Recursos Principais</h3>
                    <ul style="margin: 15px 0 25px 20px; color: var(--dark);">
                        <li>Assistente de IA para vendas educacionais</li>
                        <li>Catálogo completo de cursos universitários</li>
                        <li>Dashboard com estatísticas em tempo real</li>
                        <li>Sistema de feedback e avaliações</li>
                        <li>Painel administrativo completo</li>
                        <li>Integração com OpenRouter API</li>
                    </ul>
                    
                    <h3><i class="fas fa-code"></i> Tecnologias Utilizadas</h3>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin: 15px 0;">
                        <span class="badge badge-primary">HTML5</span>
                        <span class="badge badge-primary">CSS3</span>
                        <span class="badge badge-primary">JavaScript</span>
                        <span class="badge badge-success">OpenRouter API</span>
                        <span class="badge badge-info">Font Awesome</span>
                        <span class="badge badge-warning">Google Fonts</span>
                    </div>
                    
                    <h3><i class="fas fa-user-shield"></i> Informações de Segurança</h3>
                    <p style="color: var(--secondary); margin: 10px 0;">
                        <i class="fas fa-lock"></i> Todos os dados são armazenados localmente no seu navegador.
                        <br>
                        <i class="fas fa-shield-alt"></i> Sistema com autenticação de dois níveis (usuário/admin).
                    </p>
                    
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border);">
                        <p style="text-align: center; color: var(--secondary); font-size: 14px;">
                            <i class="fas fa-copyright"></i> 2024 Assistance SM. Todos os direitos reservados.
                            <br>
                            Versão: 4.0.1 | Última atualização: ${new Date().toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function loadAdminFeatures() {
    // Carregar funcionalidades específicas para admin
    console.log('Carregando funcionalidades administrativas...');
}

// ==============================
// FUNÇÕES UTILITÁRIAS
// ==============================
function logout() {
    if (confirm('Tem certeza que deseja sair do sistema?')) {
        // Registrar logout
        if (currentUser) {
            const logoutRecord = {
                username: currentUser.username,
                role: currentUser.role,
                timestamp: new Date().toISOString(),
                action: 'logout'
            };
            
            let adminLogs = JSON.parse(localStorage.getItem('adminLogs') || '[]');
            adminLogs.push(logoutRecord);
            localStorage.setItem('adminLogs', JSON.stringify(adminLogs));
            
            // Remover usuário dos ativos
            let activeUsers = JSON.parse(localStorage.getItem('activeUsers') || '[]');
            activeUsers = activeUsers.filter(u => u.username !== currentUser.username);
            localStorage.setItem('activeUsers', JSON.stringify(activeUsers));
        }
        
        // Limpar estado
        currentUser = null;
        isAdmin = false;
        
        // Mostrar login
        document.getElementById('app').style.display = 'none';
        document.getElementById('loginPage').style.display = 'block';
        
        // Resetar formulário de login
        document.getElementById('username').value = '';
        document.getElementById('userPass').value = 'user123';
        showTab('user', document.querySelector('.tab-btn.active'));
        
        showNotification('Logout realizado com sucesso!', 'success');
    }
}

function clearLocalData() {
    if (confirm('ATENÇÃO: Esta ação irá apagar todos os dados locais do sistema.\n\nDados que serão perdidos:\n• Histórico de chat\n• Feedbacks\n• Logs administrativos\n• Usuários ativos\n\nContinuar?')) {
        // Manter apenas dados essenciais
        const savedUser = localStorage.getItem('assistance_logged_user');
        localStorage.clear();
        
        // Restaurar usuário atual
        if (savedUser) {
            localStorage.setItem('assistance_logged_user', savedUser);
            const user = JSON.parse(savedUser);
            localStorage.setItem('currentUser', user.username);
            localStorage.setItem('userRole', user.role);
        }
        
        showNotification('Dados locais limpos com sucesso!', 'success');
        
        // Recarregar páginas afetadas
        if (currentPage === 'dashboard') loadDashboard();
        if (currentPage === 'feedback') loadFeedbackPage();
        if (currentPage === 'admin') loadAdminPage();
    }
}

function exportData() {
    const data = {
        sistema: 'Assistance SM',
        versao: '4.0.1',
        exportDate: new Date().toISOString(),
        usuario: currentUser,
        cursos: SAMPLE_COURSES,
        feedbacks: JSON.parse(localStorage.getItem('feedbacks') || '[]'),
        activeUsers: JSON.parse(localStorage.getItem('activeUsers') || '[]'),
        adminLogs: JSON.parse(localStorage.getItem('adminLogs') || '[]'),
        chatInteractions: JSON.parse(localStorage.getItem('chatInteractions') || '[]')
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `assistance-sm-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Backup exportado com sucesso!', 'success');
}

function resetSystem() {
    if (confirm('ATENÇÃO: Esta ação irá resetar completamente o sistema para os padrões de fábrica.\n\nTODOS os dados serão perdidos, incluindo:\n• Seu perfil atual\n• Histórico completo\n• Configurações\n\nDeseja continuar?')) {
        localStorage.clear();
        sessionStorage.clear();
        
        showNotification('Sistema resetado com sucesso! Recarregando...', 'success');
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }
}

function changeUserAvatar() {
    const newAvatar = prompt('Digite uma letra ou emoji para seu avatar:', currentUser.avatar);
    if (newAvatar && newAvatar.trim() !== '') {
        currentUser.avatar = newAvatar.trim().charAt(0).toUpperCase();
        localStorage.setItem('assistance_logged_user', JSON.stringify(currentUser));
        updateUserInfo();
        showNotification('Avatar alterado com sucesso!', 'success');
    }
}

function saveAISettings() {
    const model = document.getElementById('aiModel').value;
    const temperature = document.getElementById('tempRange').value;
    
    localStorage.setItem('ai_model', model);
    localStorage.setItem('ai_temperature', temperature);
    
    showNotification('Configurações de IA salvas com sucesso!', 'success');
}

// ==============================
// INICIALIZAÇÃO DO SISTEMA
// ==============================
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se há usuário logado
    const savedUser = localStorage.getItem('assistance_logged_user');
    
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        isAdmin = currentUser.role === 'admin';
        startApp();
    } else {
        // Mostrar página de login por padrão
        document.getElementById('loginPage').style.display = 'block';
        document.getElementById('app').style.display = 'none';
        
        // Preencher campos com valores padrão
        document.getElementById('username').value = 'Visitante';
        document.getElementById('userPass').value = 'user123';
        document.getElementById('adminUser').value = 'admin';
        document.getElementById('adminPass').value = 'admin123';
    }
    
    // Configurar tratamento de erros
    window.addEventListener('error', function(event) {
        console.error('Erro não tratado:', event.error);
        showNotification('Ocorreu um erro no sistema. Recarregue a página.', 'error');
    });
});
