// ==============================
// CONFIGURAÇÕES GLOBAIS
// ==============================
let currentUser = null;
let currentCourse = null;
let isTyping = false;
let API_BASE_URL = 'https://your-neon-db-api.com'; // Substitua pelo seu endpoint Neon

// ==============================
// AUTENTICAÇÃO E SESSÃO
// ==============================
async function initDatabase() {
    // Verificar se há usuário salvo
    const savedUser = localStorage.getItem('assistance_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
}

function showTab(tab, btn) {
    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    // Mostrar conteúdo da aba
    document.getElementById('userTab').style.display = tab === 'user' ? 'block' : 'none';
    document.getElementById('adminTab').style.display = tab === 'admin' ? 'block' : 'none';
}

async function loginAsUser() {
    const username = document.getElementById('username').value.trim();
    
    if (!username) {
        showNotification('Digite um nome de usuário', 'error');
        return;
    }
    
    try {
        // Simular login (substituir por chamada API real)
        const userData = {
            username: username,
            nome: username,
            role: 'user',
            status: 'active'
        };
        
        currentUser = userData;
        localStorage.setItem('assistance_user', JSON.stringify(userData));
        
        await showMainSystem();
        showNotification(`Bem-vindo, ${username}!`, 'success');
        
    } catch (error) {
        console.error('Erro no login:', error);
        showNotification('Erro ao fazer login', 'error');
    }
}

async function loginAsAdmin() {
    const username = document.getElementById('adminUser').value.trim();
    const password = document.getElementById('adminPass').value.trim();
    
    if (!username || !password) {
        showNotification('Preencha todos os campos', 'error');
        return;
    }
    
    try {
        // Simular autenticação admin
        if ((username === 'admin' && password === 'admin123') || 
            (username === 'suporte' && password === 'suporte123')) {
            
            const userData = {
                username: username,
                nome: 'Administrador',
                role: 'admin',
                status: 'active',
                isAdmin: true
            };
            
            currentUser = userData;
            localStorage.setItem('assistance_user', JSON.stringify(userData));
            
            await showMainSystem();
            showNotification(`Bem-vindo, Admin ${username}!`, 'success');
        } else {
            showNotification('Credenciais inválidas!', 'error');
        }
        
    } catch (error) {
        console.error('Erro no login admin:', error);
        showNotification('Erro ao fazer login', 'error');
    }
}

// ==============================
// FUNÇÕES DO SISTEMA PRINCIPAL
// ==============================
async function showMainSystem() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    
    // Atualizar informações do usuário
    updateUserInfo();
    
    // Configurar navegação
    setupNavigation();
    
    // Carregar dashboard inicial
    await loadDashboard();
    
    // Configurar menu mobile
    setupMobileMenu();
}

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.nome || currentUser.username;
        document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'Administrador' : 'Usuário';
        document.getElementById('userFullName').textContent = currentUser.nome || currentUser.username;
        
        const initials = (currentUser.nome || currentUser.username)
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        
        document.getElementById('userAvatar').textContent = initials;
        
        // Mostrar/ocultar menus administrativos
        const adminItems = document.querySelectorAll('.admin-only');
        adminItems.forEach(item => {
            item.style.display = currentUser.role === 'admin' ? 'flex' : 'none';
        });
    }
}

function setupNavigation() {
    // Adicionar event listeners aos itens do menu
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            // Remover classe active de todos
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            // Adicionar ao item clicado
            this.classList.add('active');
            
            // Fechar sidebar no mobile
            if (window.innerWidth <= 768) {
                document.querySelector('.sidebar').classList.remove('active');
            }
            
            // Mostrar página correspondente
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });
}

function setupMobileMenu() {
    const mobileToggle = document.createElement('button');
    mobileToggle.className = 'mobile-toggle';
    mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
    mobileToggle.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('active');
    });
    document.querySelector('.main-content').prepend(mobileToggle);
}

function showPage(page) {
    // Ocultar todas as páginas
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Mostrar página selecionada
    const pageElement = document.getElementById(page + 'Page');
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // Carregar conteúdo específico da página
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'ia':
            loadChat();
            break;
        case 'feedback':
            loadFeedbacks();
            break;
        case 'courses':
            loadCoursesManagement();
            break;
        case 'admin':
            loadAdminPanel();
            break;
        case 'settings':
            loadSettings();
            break;
        case 'about':
            loadAbout();
            break;
    }
}

// ==============================
// DASHBOARD
// ==============================
async function loadDashboard() {
    try {
        // Carregar estatísticas da API
        const stats = await fetchDashboardStats();
        updateDashboardStats(stats);
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showNotification('Erro ao carregar dashboard', 'error');
    }
}

async function fetchDashboardStats() {
    // Simular dados da API
    return {
        totalUsers: 145,
        activeCourses: 8,
        feedbacks: 89,
        activeSessions: 23,
        popularCourses: ['Farmácia', 'Direito', 'Enfermagem'],
        recentActivity: []
    };
}

function updateDashboardStats(stats) {
    const statsContainer = document.getElementById('dashboardStats');
    
    if (!statsContainer) return;
    
    const statsData = [
        {
            title: 'Usuários Ativos',
            value: stats.totalUsers || 0,
            icon: 'fas fa-users',
            color: 'var(--primary)'
        },
        {
            title: 'Cursos Ativos',
            value: stats.activeCourses || 0,
            icon: 'fas fa-book',
            color: 'var(--success)'
        },
        {
            title: 'Feedbacks',
            value: stats.feedbacks || 0,
            icon: 'fas fa-comment',
            color: 'var(--warning)'
        },
        {
            title: 'Sessões Ativas',
            value: stats.activeSessions || 0,
            icon: 'fas fa-user-clock',
            color: 'var(--info)'
        }
    ];
    
    statsContainer.innerHTML = statsData.map(stat => `
        <div class="stat-card">
            <div class="stat-icon" style="background: ${stat.color}">
                <i class="${stat.icon}"></i>
            </div>
            <div class="stat-info">
                <h3>${stat.value}</h3>
                <p>${stat.title}</p>
            </div>
        </div>
    `).join('');
}

// ==============================
// CHAT IA COM OPENROUTER
// ==============================
async function loadChat() {
    try {
        // Carregar cursos da API
        const courses = await fetchCourses();
        displayCourses(courses);
        
        // Configurar campo de entrada
        const userInput = document.getElementById('userInput');
        if (userInput) {
            userInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            userInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        }
        
        // Configurar botão de enviar
        const sendButton = document.getElementById('sendButton');
        if (sendButton) {
            sendButton.addEventListener('click', sendMessage);
        }
        
    } catch (error) {
        console.error('Erro ao carregar chat:', error);
        showNotification('Erro ao carregar chat', 'error');
    }
}

async function fetchCourses() {
    // Simular chamada API
    return [
        {
            id: '1',
            name: 'Farmácia',
            duration: '5 anos (bacharelado)',
            icon: 'fas fa-pills',
            description: 'Curso completo de Farmácia com ênfase em pesquisa e prática hospitalar.',
            price: 1250.00
        },
        {
            id: '2',
            name: 'Direito',
            duration: '5 anos (bacharelado)',
            icon: 'fas fa-balance-scale',
            description: 'Formação jurídica completa com foco em prática forense.',
            price: 1350.00
        },
        {
            id: '3',
            name: 'Enfermagem',
            duration: '5 anos (bacharelado)',
            icon: 'fas fa-user-md',
            description: 'Formação em Enfermagem com foco em cuidado humanizado.',
            price: 1100.00
        }
    ];
}

function displayCourses(courses) {
    const container = document.getElementById('cursosContainer');
    if (!container) return;
    
    if (courses.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--secondary);">
                <i class="fas fa-book" style="font-size: 48px; margin-bottom: 16px;"></i>
                <p>Nenhum curso disponível</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = courses.map(course => `
        <div class="curso-item" data-course-id="${course.id}" onclick="selectCourse('${course.id}')">
            <div class="curso-icon" style="background: linear-gradient(135deg, var(--primary) 0%, var(--purple) 100%);">
                <i class="${course.icon || 'fas fa-book'}"></i>
            </div>
            <div class="curso-info">
                <h3>${course.name}</h3>
                <p>${course.duration || 'Duração não informada'}</p>
                <small style="color: var(--success); font-weight: 600;">
                    R$ ${course.price ? course.price.toFixed(2) : '--'}
                </small>
            </div>
        </div>
    `).join('');
}

function selectCourse(courseId) {
    // Encontrar curso selecionado
    const courses = document.querySelectorAll('.curso-item');
    courses.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-course-id') === courseId) {
            item.classList.add('active');
            currentCourse = courseId;
            
            // Atualizar header do chat
            const courseName = item.querySelector('h3').textContent;
            document.getElementById('currentCourse').innerHTML = `
                <i class="fas fa-book"></i>
                <span>${courseName}</span>
            `;
            
            // Limpar chat anterior
            clearChat();
            
            // Adicionar mensagem inicial
            addMessage('assistant', `
                Olá! Sou seu assistente especializado em <strong>${courseName}</strong>.
                
                **Como posso ajudar você hoje?**
                
                • Fornecer informações detalhadas sobre o curso
                • Responder dúvidas sobre mercado de trabalho
                • Explicar sobre especializações disponíveis
                • Falar sobre valores e condições de pagamento
                • Criar scripts para vendas
                
                O que gostaria de saber sobre este curso?
            `);
            
            // Atualizar ações rápidas
            updateQuickActions(courseName);
        }
    });
}

function updateQuickActions(courseName) {
    const quickActions = document.getElementById('quickActions');
    if (!quickActions) return;
    
    const actions = [
        { text: `📚 Info sobre ${courseName}`, prompt: `Me dê informações completas sobre o curso de ${courseName}` },
        { text: '💼 Mercado de trabalho', prompt: `Quais são as oportunidades de mercado para ${courseName}?` },
        { text: '💰 Valores e condições', prompt: `Quais são os valores e condições de pagamento para ${courseName}?` },
        { text: '📞 Script para ligação', prompt: `Crie um script de vendas para ligação telefônica sobre ${courseName}` },
        { text: '💬 Script para WhatsApp', prompt: `Elabore um script de vendas para WhatsApp sobre ${courseName}` }
    ];
    
    quickActions.innerHTML = actions.map(action => `
        <button class="quick-action" onclick="setPrompt('${action.prompt.replace(/'/g, "\\'")}')">
            ${action.text}
        </button>
    `).join('');
}

function setPrompt(prompt) {
    const userInput = document.getElementById('userInput');
    if (userInput) {
        userInput.value = prompt;
        userInput.focus();
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    }
}

function clearChat() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.innerHTML = '';
    }
}

function addMessage(sender, content, isCopyable = false) {
    const container = document.getElementById('messagesContainer');
    if (!container) return null;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    let actionsHTML = '';
    if (isCopyable && sender === 'assistant') {
        actionsHTML = `
            <div class="message-actions">
                <button class="btn btn-success btn-sm" onclick="copyToClipboard(this)">
                    <i class="fas fa-copy"></i> Copiar
                </button>
                <button class="btn btn-info btn-sm" onclick="copyForWhatsApp(this)">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
            </div>
        `;
    }
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
            ${sender === 'user' ? 'Você' : 'Assistente IA'}
        </div>
        <div class="message-content">${content}</div>
        ${actionsHTML}
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    return messageDiv;
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    
    if (!input || !sendButton) return;
    
    const message = input.value.trim();
    
    if (!message) {
        showNotification('Digite uma mensagem', 'warning');
        return;
    }
    
    if (!currentCourse) {
        showNotification('Selecione um curso primeiro!', 'warning');
        return;
    }
    
    // Adicionar mensagem do usuário
    addMessage('user', message);
    
    // Limpar input
    input.value = '';
    input.style.height = 'auto';
    
    // Desabilitar botão e mostrar loader
    sendButton.disabled = true;
    sendButton.innerHTML = '<div class="loader"></div>';
    
    // Mostrar indicador de digitação
    showTypingIndicator();
    
    try {
        // Gerar resposta da IA
        const response = await generateAIResponse(message);
        
        // Adicionar resposta com botões de ação
        addMessage('assistant', response, true);
        
        // Salvar no histórico (opcional)
        await saveChatHistory(message, response);
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        addMessage('assistant', 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.');
    } finally {
        // Restaurar botão
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        
        // Remover indicador de digitação
        hideTypingIndicator();
    }
}

async function generateAIResponse(userMessage) {
    // Verificar se API key está configurada
    const apiKey = localStorage.getItem('openrouter_api_key');
    const selectedModel = localStorage.getItem('ai_model') || 'mistralai/mistral-7b-instruct:free';
    
    if (!apiKey) {
        // Usar respostas locais se não houver API key
        return generateLocalResponse(userMessage);
    }
    
    try {
        // Configurar a requisição para OpenRouter
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Assistance SM'
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    {
                        role: 'system',
                        content: `Você é um assistente de vendas especializado em cursos universitários. 
                        Use informações específicas do curso quando disponíveis. 
                        Responda em português brasileiro de forma clara e profissional.
                        Inclua formatação markdown para melhor leitura.`
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                temperature: parseFloat(localStorage.getItem('ai_temperature') || '0.7'),
                max_tokens: parseInt(localStorage.getItem('max_tokens') || '1000')
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('Erro na API OpenRouter:', error);
        // Fallback para resposta local
        return generateLocalResponse(userMessage);
    }
}

function generateLocalResponse(userMessage) {
    // Respostas locais pré-definidas
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('informação') || lowerMessage.includes('sobre')) {
        return `**Informações sobre o curso:**
        
• **Duração:** 5 anos (bacharelado)
• **Modalidades:** Presencial e EaD
• **Grade curricular atualizada**
• **Corpo docente especializado**
• **Laboratórios modernos**

**Áreas de atuação:**
- Hospitais e clínicas
- Indústrias farmacêuticas
- Pesquisa científica
- Vigilância sanitária

**Diferenciais:**
✅ Parcerias com empresas
✅ Programa de estágio garantido
✅ Visitas técnicas regulares
✅ Certificações intermediárias`;
    }
    
    if (lowerMessage.includes('preço') || lowerMessage.includes('valor')) {
        return `**Informações de Investimento:**

**Mensalidades:**
• Presencial: R$ 1.200,00
• EaD: R$ 650,00

**Formas de pagamento:**
• À vista com 15% de desconto
• Parcelamento em até 48x
• Financiamento estudantil (FIES)
• Programa de bolsas disponível

**Descontos especiais:**
- Transferência externa: 30%
- 2ª graduação: 25%
- Indicação: 20% para ambos`;
    }
    
    if (lowerMessage.includes('script') || lowerMessage.includes('whatsapp')) {
        return `**📱 SCRIPT PARA WHATSAPP - CURSO DE FARMÁCIA**

*Mensagem inicial:*
Olá [Nome]! Tudo bem? 😊

Sou [Seu nome] da Assistance SM e gostaria de falar sobre nosso curso de *Farmácia*.

*Duração:* 5 anos (bacharelado)

*Principais diferenciais:*
✅ Corpo docente qualificado com experiência de mercado
✅ Laboratórios modernos e equipados
✅ Programa de estágio garantido em farmácias e hospitais
✅ Parcerias com redes de farmácias para colocação profissional

*Modalidades disponíveis:*
🏫 Presencial - R$ 1.250/mês
💻 Semipresencial - R$ 980/mês
🌐 EaD - R$ 750/mês

*Mercado de trabalho:*
💼 Farmacêutico Hospitalar: R$ 4.200 - R$ 6.800
💼 Farmacêutico de Drogaria: R$ 3.800 - R$ 5.500
💼 Farmacêutico Industrial: R$ 5.000 - R$ 8.000

*Encerramento:*
Tem interesse em saber mais detalhes ou agendar uma visita para conhecer nossa estrutura? 😄

*Call to Action:*
"Você gostaria de receber mais informações sobre o processo seletivo ou tem alguma dúvida específica?"`;
    }
    
    return `Entendi sua pergunta sobre "${userMessage}". 

Como assistente especializado, posso fornecer informações detalhadas sobre:

1. **Grade curricular completa**
2. **Corpo docente e qualificações**
3. **Infraestrutura do curso**
4. **Processo seletivo**
5. **Estágios obrigatórios**
6. **Programa de intercâmbio**
7. **Especializações disponíveis**

Você tem interesse em algum desses tópicos específicos?`;
}

// ==============================
// FUNÇÕES DE UTILIDADE
// ==============================
function showTypingIndicator() {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

async function saveChatHistory(userMessage, aiResponse) {
    // Salvar no localStorage (ou enviar para API)
    const chatHistory = JSON.parse(localStorage.getItem('chat_history') || '[]');
    chatHistory.push({
        userId: currentUser?.username,
        courseId: currentCourse,
        userMessage,
        aiResponse,
        timestamp: new Date().toISOString()
    });
    
    localStorage.setItem('chat_history', JSON.stringify(chatHistory.slice(-50))); // Manter apenas últimos 50
}

function copyToClipboard(button) {
    const messageContent = button.closest('.message').querySelector('.message-content');
    const text = messageContent.textContent || messageContent.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        button.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        button.classList.remove('btn-success');
        button.classList.add('btn-primary');
        
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-copy"></i> Copiar';
            button.classList.remove('btn-primary');
            button.classList.add('btn-success');
        }, 2000);
    });
}

function copyForWhatsApp(button) {
    const messageContent = button.closest('.message').querySelector('.message-content');
    let text = messageContent.textContent || messageContent.innerText;
    
    // Limpar formatação para WhatsApp
    text = text
        .replace(/\*\*(.*?)\*\*/g, '*$1*') // Converter **bold** para *bold*
        .replace(/\n{3,}/g, '\n\n') // Limitar quebras de linha
        .trim();
    
    const whatsappText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${whatsappText}`;
    
    // Abrir WhatsApp ou copiar texto
    if (navigator.share) {
        navigator.share({
            title: 'Informações do Curso',
            text: text,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(text).then(() => {
            button.innerHTML = '<i class="fas fa-check"></i> Copiado para WhatsApp!';
            button.classList.remove('btn-info');
            button.classList.add('btn-success');
            
            setTimeout(() => {
                button.innerHTML = '<i class="fab fa-whatsapp"></i> WhatsApp';
                button.classList.remove('btn-success');
                button.classList.add('btn-info');
            }, 2000);
        });
    }
}

// ==============================
// PAINEL ADMINISTRATIVO
// ==============================
async function loadAdminPanel() {
    if (currentUser?.role !== 'admin') {
        showNotification('Acesso restrito a administradores', 'error');
        showPage('dashboard');
        return;
    }
    
    try {
        // Carregar dados da API
        const [users, courses, feedbacks, requests] = await Promise.all([
            fetchUsers(),
            fetchCourses(),
            fetchFeedbacks(),
            fetchRequests()
        ]);
        
        displayAdminPanel(users, courses, feedbacks, requests);
        updateApiStatus();
        
    } catch (error) {
        console.error('Erro ao carregar painel admin:', error);
        showNotification('Erro ao carregar painel administrativo', 'error');
    }
}

async function fetchUsers() {
    // Simular API call
    return [
        { username: 'admin', nome: 'Administrador', role: 'admin', lastLogin: new Date().toISOString() },
        { username: 'usuario1', nome: 'João Silva', role: 'user', lastLogin: new Date().toISOString() },
        { username: 'usuario2', nome: 'Maria Santos', role: 'user', lastLogin: new Date().toISOString() }
    ];
}

async function fetchFeedbacks() {
    // Simular API call
    return [
        { id: 1, user: 'João Silva', rating: 5, comment: 'Ótimo sistema!', date: new Date().toISOString() },
        { id: 2, user: 'Maria Santos', rating: 4, comment: 'Muito útil', date: new Date().toISOString() }
    ];
}

async function fetchRequests() {
    // Simular API call
    return [
        { id: 1, type: 'informação_curso', course: 'Farmácia', count: 45 },
        { id: 2, type: 'script_whatsapp', course: 'Direito', count: 32 },
        { id: 3, type: 'mercado_trabalho', course: 'Enfermagem', count: 28 }
    ];
}

function displayAdminPanel(users, courses, feedbacks, requests) {
    const container = document.getElementById('adminPage');
    if (!container) return;
    
    container.innerHTML = `
        <div class="admin-grid">
            <div class="admin-card">
                <h3><i class="fas fa-chart-line"></i> Estatísticas Gerais</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">${users.length}</div>
                        <div class="stat-label">Usuários</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${courses.length}</div>
                        <div class="stat-label">Cursos</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${feedbacks.length}</div>
                        <div class="stat-label">Feedbacks</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${requests.reduce((a, b) => a + b.count, 0)}</div>
                        <div class="stat-label">Requisições</div>
                    </div>
                </div>
            </div>
            
            <div class="admin-card">
                <h3><i class="fas fa-cogs"></i> Configurações IA</h3>
                <div class="api-status ${localStorage.getItem('openrouter_api_key') ? 'connected' : 'disconnected'}">
                    <i class="fas fa-plug"></i>
                    <span>API OpenRouter: ${localStorage.getItem('openrouter_api_key') ? 'CONECTADA' : 'DESCONECTADA'}</span>
                </div>
                <button class="btn btn-primary" onclick="showAISettings()">
                    <i class="fas fa-sliders-h"></i> Configurar IA
                </button>
            </div>
        </div>
        
        <div class="admin-section">
            <h3 class="section-title">
                <i class="fas fa-fire"></i> Serviços Mais Solicitados
            </h3>
            <table>
                <thead>
                    <tr>
                        <th>Serviço</th>
                        <th>Curso</th>
                        <th>Requisições</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${requests.map(req => `
                        <tr>
                            <td>${req.type.replace(/_/g, ' ').toUpperCase()}</td>
                            <td>${req.course}</td>
                            <td>${req.count}</td>
                            <td><span class="badge badge-success">Ativo</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="admin-section">
            <h3 class="section-title">
                <i class="fas fa-users"></i> Últimos Usuários
            </h3>
            <table>
                <thead>
                    <tr>
                        <th>Usuário</th>
                        <th>Nome</th>
                        <th>Tipo</th>
                        <th>Último Acesso</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.username}</td>
                            <td>${user.nome}</td>
                            <td><span class="badge ${user.role === 'admin' ? 'badge-danger' : 'badge-success'}">
                                ${user.role === 'admin' ? 'Admin' : 'Usuário'}
                            </span></td>
                            <td>${new Date(user.lastLogin).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==============================
// CONFIGURAÇÕES DA IA
// ==============================
function showAISettings() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <h3 style="margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-robot"></i> Configurações da IA
            </h3>
            
            <div class="form-group">
                <label class="form-label">API Key OpenRouter</label>
                <input type="password" id="apiKeyInput" class="form-control" 
                       value="${localStorage.getItem('openrouter_api_key') || ''}"
                       placeholder="Cole sua API key aqui">
                <small style="color: var(--secondary); margin-top: 4px; display: block;">
                    Obtenha sua API key em <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai/keys</a>
                </small>
            </div>
            
            <div class="form-group" style="margin-top: 20px;">
                <label class="form-label">Modelo de IA</label>
                <select id="modelSelect" class="form-control">
                    <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (Free)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="claude-2">Claude 2</option>
                </select>
            </div>
            
            <div class="form-group" style="margin-top: 20px;">
                <label class="form-label">
                    Temperatura: <span id="tempValue">${localStorage.getItem('ai_temperature') || '0.7'}</span>
                </label>
                <input type="range" id="tempRange" class="form-control" min="0" max="1" step="0.1" 
                       value="${localStorage.getItem('ai_temperature') || '0.7'}">
            </div>
            
            <div class="form-group" style="margin-top: 20px;">
                <label class="form-label">Tokens Máximos</label>
                <input type="number" id="maxTokensInput" class="form-control" 
                       value="${localStorage.getItem('max_tokens') || '1000'}" min="100" max="4000">
            </div>
            
            <div style="margin-top: 32px; display: flex; gap: 12px; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                    Cancelar
                </button>
                <button class="btn btn-primary" onclick="saveAISettings()">
                    <i class="fas fa-save"></i> Salvar Configurações
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Configurar slider de temperatura
    const tempRange = document.getElementById('tempRange');
    const tempValue = document.getElementById('tempValue');
    if (tempRange && tempValue) {
        tempRange.addEventListener('input', (e) => {
            tempValue.textContent = e.target.value;
        });
    }
    
    // Predefinir modelo selecionado
    const modelSelect = document.getElementById('modelSelect');
    const savedModel = localStorage.getItem('ai_model');
    if (modelSelect && savedModel) {
        modelSelect.value = savedModel;
    }
}

function saveAISettings() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    const model = document.getElementById('modelSelect').value;
    const temperature = document.getElementById('tempRange').value;
    const maxTokens = document.getElementById('maxTokensInput').value;
    
    // Validar inputs
    if (!apiKey) {
        showNotification('Digite uma API key válida', 'error');
        return;
    }
    
    // Salvar configurações
    localStorage.setItem('openrouter_api_key', apiKey);
    localStorage.setItem('ai_model', model);
    localStorage.setItem('ai_temperature', temperature);
    localStorage.setItem('max_tokens', maxTokens);
    
    // Fechar modal
    document.querySelector('.modal-overlay')?.remove();
    
    // Atualizar status
    updateApiStatus();
    
    showNotification('Configurações da IA salvas com sucesso!', 'success');
}

function updateApiStatus() {
    const badge = document.getElementById('apiStatusBadge');
    if (badge) {
        const hasApiKey = !!localStorage.getItem('openrouter_api_key');
        badge.textContent = `API: ${hasApiKey ? 'CONECTADA' : 'OFFLINE'}`;
        badge.style.color = hasApiKey ? 'var(--success)' : 'var(--danger)';
    }
}

// ==============================
// GESTÃO DE CURSOS
// ==============================
async function loadCoursesManagement() {
    if (currentUser?.role !== 'admin') {
        showNotification('Acesso restrito a administradores', 'error');
        showPage('dashboard');
        return;
    }
    
    try {
        const courses = await fetchCourses();
        displayCoursesManagement(courses);
        
    } catch (error) {
        console.error('Erro ao carregar gestão de cursos:', error);
        showNotification('Erro ao carregar cursos', 'error');
    }
}

function displayCoursesManagement(courses) {
    const container = document.getElementById('coursesPage');
    if (!container) return;
    
    container.innerHTML = `
        <div class="admin-section">
            <h2 class="section-title">
                <i class="fas fa-book"></i> Gestão de Cursos
            </h2>
            
            <button class="btn btn-success" onclick="showAddCourseModal()" style="margin-bottom: 24px;">
                <i class="fas fa-plus"></i> Adicionar Novo Curso
            </button>
            
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Curso</th>
                            <th>Duração</th>
                            <th>Preço</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${courses.map(course => `
                            <tr>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--primary) 0%, var(--purple) 100%); 
                                             border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
                                            <i class="${course.icon || 'fas fa-book'}"></i>
                                        </div>
                                        <div>
                                            <strong>${course.name}</strong><br>
                                            <small style="color: var(--secondary);">${course.description?.substring(0, 50)}...</small>
                                        </div>
                                    </div>
                                </td>
                                <td>${course.duration}</td>
                                <td>R$ ${course.price?.toFixed(2) || '--'}</td>
                                <td><span class="badge badge-success">Ativo</span></td>
                                <td>
                                    <div style="display: flex; gap: 8px;">
                                        <button class="btn btn-sm btn-primary" onclick="editCourse('${course.id}')">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteCourse('${course.id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function showAddCourseModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <h3 style="margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-plus-circle"></i> Adicionar Novo Curso
            </h3>
            
            <form id="courseForm">
                <div class="form-group">
                    <label class="form-label">Nome do Curso</label>
                    <input type="text" id="courseName" class="form-control" required>
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">Duração</label>
                    <input type="text" id="courseDuration" class="form-control" required>
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">Ícone (FontAwesome)</label>
                    <input type="text" id="courseIcon" class="form-control" placeholder="fas fa-book">
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">Descrição</label>
                    <textarea id="courseDescription" class="form-control" rows="3" required></textarea>
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">Preço Mensal (R$)</label>
                    <input type="number" id="coursePrice" class="form-control" step="0.01" required>
                </div>
                
                <div style="margin-top: 32px; display: flex; gap: 12px; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Salvar Curso
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = document.getElementById('courseForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveCourse();
    });
}

async function saveCourse() {
    // Implementar salvamento via API
    showNotification('Funcionalidade em desenvolvimento', 'info');
}

// ==============================
// FEEDBACKS
// ==============================
async function loadFeedbacks() {
    try {
        const feedbacks = await fetchFeedbacks();
        displayFeedbacks(feedbacks);
        
    } catch (error) {
        console.error('Erro ao carregar feedbacks:', error);
    }
}

function displayFeedbacks(feedbacks) {
    const container = document.getElementById('feedbackPage');
    if (!container) return;
    
    container.innerHTML = `
        <div class="admin-section">
            <h2 class="section-title">
                <i class="fas fa-comment-dots"></i> Sistema de Feedback
            </h2>
            
            <div style="background: var(--light); padding: 24px; border-radius: var(--radius); margin-bottom: 24px;">
                <h4 style="margin-bottom: 16px;">Envie seu feedback</h4>
                
                <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                    ${[1,2,3,4,5].map(star => `
                        <button class="star-rating" data-rating="${star}" onclick="setRating(${star})">
                            <i class="far fa-star"></i>
                        </button>
                    `).join('')}
                </div>
                
                <textarea id="feedbackText" class="form-control" placeholder="Digite seu comentário..." rows="3"></textarea>
                
                <button class="btn btn-primary" onclick="submitFeedback()" style="margin-top: 16px;">
                    <i class="fas fa-paper-plane"></i> Enviar Feedback
                </button>
            </div>
            
            <h3 style="margin-bottom: 16px;">Feedbacks Recebidos</h3>
            
            ${feedbacks.length === 0 ? `
                <div style="text-align: center; padding: 40px; color: var(--secondary);">
                    <i class="far fa-comment-dots" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <p>Nenhum feedback recebido ainda</p>
                </div>
            ` : `
                <div class="feedback-list">
                    ${feedbacks.map(feedback => `
                        <div style="background: white; padding: 20px; border-radius: var(--radius); 
                             margin-bottom: 16px; border: 1px solid #e5e7eb;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                <div>
                                    <strong>${feedback.user}</strong>
                                    <div style="color: var(--warning); margin-top: 4px;">
                                        ${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}
                                    </div>
                                </div>
                                <small style="color: var(--secondary);">
                                    ${new Date(feedback.date).toLocaleDateString()}
                                </small>
                            </div>
                            <p>${feedback.comment}</p>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

let currentRating = 0;

function setRating(rating) {
    currentRating = rating;
    document.querySelectorAll('.star-rating').forEach((star, index) => {
        star.innerHTML = `<i class="${index < rating ? 'fas' : 'far'} fa-star"></i>`;
        star.style.color = index < rating ? 'var(--warning)' : '#ddd';
    });
}

async function submitFeedback() {
    const text = document.getElementById('feedbackText').value.trim();
    
    if (!currentRating) {
        showNotification('Selecione uma avaliação', 'warning');
        return;
    }
    
    if (!text) {
        showNotification('Digite um comentário', 'warning');
        return;
    }
    
    try {
        // Simular envio para API
        showNotification('Feedback enviado com sucesso! Obrigado.', 'success');
        
        // Limpar formulário
        document.getElementById('feedbackText').value = '';
        setRating(0);
        
        // Recarregar feedbacks
        loadFeedbacks();
        
    } catch (error) {
        console.error('Erro ao enviar feedback:', error);
        showNotification('Erro ao enviar feedback', 'error');
    }
}

// ==============================
// CONFIGURAÇÕES
// ==============================
function loadSettings() {
    const container = document.getElementById('settingsPage');
    if (!container) return;
    
    container.innerHTML = `
        <div class="admin-section">
            <h2 class="section-title">
                <i class="fas fa-cog"></i> Configurações do Sistema
            </h2>
            
            <div class="config-grid">
                <div class="admin-card">
                    <h3><i class="fas fa-robot"></i> Configurações IA</h3>
                    <button class="btn btn-primary" onclick="showAISettings()">
                        <i class="fas fa-sliders-h"></i> Configurar IA
                    </button>
                </div>
                
                <div class="admin-card">
                    <h3><i class="fas fa-database"></i> Gerenciar Dados</h3>
                    <button class="btn btn-warning" onclick="clearLocalData()">
                        <i class="fas fa-trash"></i> Limpar Cache Local
                    </button>
                </div>
                
                <div class="admin-card">
                    <h3><i class="fas fa-bell"></i> Notificações</h3>
                    <div class="form-check" style="margin-top: 12px;">
                        <input type="checkbox" id="notificationsToggle" class="form-check-input">
                        <label class="form-check-label" for="notificationsToggle">
                            Receber notificações
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function clearLocalData() {
    if (confirm('Tem certeza que deseja limpar todos os dados locais? Isso não afetará os dados do servidor.')) {
        localStorage.removeItem('chat_history');
        localStorage.removeItem('assistance_user');
        showNotification('Dados locais limpos com sucesso', 'success');
    }
}

// ==============================
// SOBRE
// ==============================
function loadAbout() {
    const container = document.getElementById('aboutPage');
    if (!container) return;
    
    container.innerHTML = `
        <div class="admin-section">
            <h2 class="section-title">
                <i class="fas fa-info-circle"></i> Sobre o Sistema
            </h2>
            
            <div style="max-width: 800px;">
                <p style="margin-bottom: 20px; line-height: 1.8;">
                    <strong>Assistance SM v4.0</strong> é um sistema inteligente desenvolvido para gestão educacional 
                    com integração de Inteligência Artificial avançada.
                </p>
                
                <h3 style="margin: 24px 0 16px 0; color: var(--primary);">Funcionalidades Principais:</h3>
                <ul style="margin-left: 24px; margin-bottom: 24px; line-height: 1.8;">
                    <li><strong>Dashboard Intuitivo:</strong> Visualização em tempo real de estatísticas e métricas do sistema</li>
                    <li><strong>Assistente IA Avançado:</strong> Chatbot inteligente para suporte e vendas de cursos com integração OpenRouter</li>
                    <li><strong>Sistema de Feedback:</strong> Avaliação e coleta de opiniões dos usuários em tempo real</li>
                    <li><strong>Gestão de Cursos:</strong> CRUD completo com integração ao banco de dados Neon</li>
                    <li><strong>Painel Administrativo:</strong> Controle total de usuários, requisições e configurações do sistema</li>
                    <li><strong>Exportação para WhatsApp:</strong> Copie respostas formatadas diretamente para conversas</li>
                </ul>
                
                <div style="background: linear-gradient(135deg, var(--primary-light) 0%, #e0e7ff 100%); 
                     padding: 24px; border-radius: var(--radius); margin-top: 32px;">
                    <h3 style="color: var(--primary); margin-bottom: 12px;">Informações Técnicas:</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        <div>
                            <strong>Versão:</strong> 4.0.1
                        </div>
                        <div>
                            <strong>Banco de Dados:</strong> Neon PostgreSQL
                        </div>
                        <div>
                            <strong>IA:</strong> OpenRouter API
                        </div>
                        <div>
                            <strong>Desenvolvido por:</strong> Assistance Team
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==============================
// NOTIFICAÇÕES
// ==============================
function showNotification(message, type = 'info', duration = 3000) {
    // Remover notificações existentes
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover após duração
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, duration);
    
    return notification;
}

// ==============================
// LOGOUT
// ==============================
function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        localStorage.removeItem('assistance_user');
        currentUser = null;
        document.getElementById('app').style.display = 'none';
        document.getElementById('loginPage').style.display = 'flex';
        showNotification('Logout realizado com sucesso', 'info');
    }
}

// ==============================
// INICIALIZAÇÃO DO SISTEMA
// ==============================
document.addEventListener('DOMContentLoaded', async () => {
    await initDatabase();
    
    // Verificar se há usuário logado
    if (currentUser) {
        await showMainSystem();
    }
    
    // Configurar eventos globais
    setupGlobalEvents();
});

function setupGlobalEvents() {
    // Fechar modais ao clicar fora
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.remove();
        }
    });
    
    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelector('.modal-overlay')?.remove();
        }
    });
}

// ==============================
// EXPORTAR FUNÇÕES PARA HTML
// ==============================
window.showTab = showTab;
window.loginAsUser = loginAsUser;
window.loginAsAdmin = loginAsAdmin;
window.logout = logout;
window.sendMessage = sendMessage;
window.setPrompt = setPrompt;
window.copyToClipboard = copyToClipboard;
window.copyForWhatsApp = copyForWhatsApp;
window.setRating = setRating;
window.submitFeedback = submitFeedback;
window.showAISettings = showAISettings;
window.saveAISettings = saveAISettings;
