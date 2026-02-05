// js/script.js - Sistema completo com API Neon + Vercel

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
// FUNÇÕES DE LOGIN
// ==============================
async function loginAsAdmin() {
    const username = document.getElementById('adminUser').value.trim();
    const password = document.getElementById('adminPass').value.trim();
    
    if (!username || !password) {
        showNotification('Preencha todos os campos', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username, // NÃO converter para lowercase
                password: password,
                isAdmin: true
            })
        });
        
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
        showNotification('Erro ao conectar com a API', 'error');
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
}

function startAdminApp(user) {
    CONFIG.currentUser = user;
    CONFIG.isAdmin = true;
    
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appAdmin').style.display = 'flex';
    
    // Atualizar informações do admin
    document.getElementById('adminAvatar').textContent = 'A';
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
}

// ==============================
// NAVEGAÇÃO
// ==============================
function setupUserNavigation() {
    document.querySelectorAll('#appUser .nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('#appUser .nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            const page = this.getAttribute('data-page');
            navigateToUserPage(page);
        });
    });
}

function setupAdminNavigation() {
    document.querySelectorAll('#appAdmin .nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('#appAdmin .nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            const page = this.getAttribute('data-page');
            navigateToAdminPage(page);
        });
    });
}

function navigateToUserPage(page) {
    document.querySelectorAll('#pagesUser .page').forEach(p => p.classList.remove('active'));
    document.getElementById(page + 'Page').classList.add('active');
    CONFIG.currentPage = page;
    
    switch(page) {
        case 'catalog':
            loadUserCatalog();
            break;
    }
}

function navigateToAdminPage(page) {
    document.querySelectorAll('#pagesAdmin .page').forEach(p => p.classList.remove('active'));
    document.getElementById(page + 'Page').classList.add('active');
    
    switch(page) {
        case 'dashboard':
            loadAdminDashboard();
            break;
        case 'courses':
            loadAdminCourses();
            break;
        case 'config':
            loadAdminConfig();
            break;
        case 'api':
            loadAIConfigPage();
            break;
        case 'users':
            loadAdminUsers();
            break;
    }
}

// ==============================
// FUNÇÕES DA API
// ==============================
async function loadCoursesFromAPI() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/cursos`);
        if (!response.ok) throw new Error('Erro ao carregar cursos');
        
        const cursos = await response.json();
        displayCourses(cursos);
    } catch (error) {
        console.error('Erro ao carregar cursos:', error);
        // Fallback: usar cursos de exemplo
        displayCourses(getSampleCourses());
    }
}

function displayCourses(cursos) {
    const container = document.getElementById('cursosContainer');
    
    if (!cursos || cursos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-book" style="font-size: 48px; color: var(--secondary); margin-bottom: 16px;"></i>
                <p style="color: var(--secondary);">Nenhum curso disponível no momento.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = cursos.map(course => `
        <div class="curso-item" data-course-id="${course.id}" onclick="selectCourse('${course.id}')">
            <h4 style="color: ${course.cor || '#4361ee'}">${course.nome}</h4>
            <p>${course.descricao || 'Descrição não disponível'}</p>
            <div class="curso-tags">
                ${(course.tags ? (Array.isArray(course.tags) ? course.tags : JSON.parse(course.tags)) : []).map(tag => 
                    `<span class="curso-tag">${tag}</span>`
                ).join('')}
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 12px;">
                <small><i class="fas fa-clock"></i> ${course.duracao || 'Não informado'}</small>
                <small><i class="fas fa-users"></i> ${course.vagas || '0'} vagas</small>
            </div>
        </div>
    `).join('');
}

function getSampleCourses() {
    return [
        {
            id: '1',
            nome: 'Medicina',
            descricao: 'Formação completa em medicina com especializações',
            duracao: '6 anos',
            vagas: 120,
            investimento: 'R$ 8.500/mês',
            tags: ['Saúde', 'Presencial', 'Integral'],
            cor: '#ef4444'
        },
        {
            id: '2',
            nome: 'Engenharia Civil',
            descricao: 'Projetos, construção e manutenção de estruturas',
            duracao: '5 anos',
            vagas: 200,
            investimento: 'R$ 1.800/mês',
            tags: ['Exatas', 'Presencial', 'Noturno'],
            cor: '#3b82f6'
        }
    ];
}

// ==============================
// CHAT IA
// ==============================
function setupChatEvents() {
    const textarea = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    
    if (!textarea || !sendButton) return;
    
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    sendButton.addEventListener('click', sendMessage);
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (!message) {
        showNotification('Digite uma mensagem', 'warning');
        return;
    }
    
    if (!CONFIG.selectedCourse) {
        showNotification('Selecione um curso primeiro!', 'warning');
        return;
    }
    
    // Adicionar mensagem do usuário
    addMessage('user', message);
    
    // Limpar input
    input.value = '';
    input.style.height = 'auto';
    
    // Mostrar indicador de digitação
    showTypingIndicator();
    
    try {
        let aiResponse;
        
        // Verificar se há chave OpenRouter configurada
        if (CONFIG.OPENROUTER_API_KEY) {
            // Usar IA online
            aiResponse = await generateAIResponse(message);
        } else {
            // Usar respostas locais
            setTimeout(() => {
                removeTypingIndicator();
                aiResponse = generateLocalResponse(message);
                addMessage('assistant', aiResponse);
                showNotification('Usando respostas locais - Configure a API OpenRouter para IA avançada', 'info');
            }, 1500);
            return;
        }
        
        removeTypingIndicator();
        addMessage('assistant', aiResponse);
        
        // Salvar interação no banco de dados
        await saveChatInteraction(message, aiResponse);
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        removeTypingIndicator();
        addMessage('assistant', `Desculpe, ocorreu um erro: ${error.message}. Tente novamente.`);
    }
}

async function generateAIResponse(message) {
    if (!CONFIG.OPENROUTER_API_KEY) {
        throw new Error('API OpenRouter não configurada');
    }
    
    const course = CONFIG.selectedCourse;
    
    const response = await fetch(CONFIG.OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CONFIG.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Assistance SM'
        },
        body: JSON.stringify({
            model: CONFIG.AI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: `Você é um assistente especializado no curso de ${course.nome}.
                    
                    Informações do curso:
                    - Nome: ${course.nome}
                    - Descrição: ${course.descricao || 'Não disponível'}
                    - Duração: ${course.duracao || 'Não informado'}
                    - Vagas: ${course.vagas || 'Não informado'}
                    - Investimento: ${course.investimento || 'Não informado'}
                    
                    Instruções:
                    1. Responda em português brasileiro
                    2. Seja preciso e informativo
                    3. Use formatação HTML básica para melhorar a legibilidade
                    4. Se a pergunta for sobre carreira, forneça informações sobre mercado de trabalho
                    5. Se for sobre o curso, explique detalhadamente`
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            temperature: CONFIG.AI_TEMPERATURE,
            max_tokens: 1500
        })
    });
    
    if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

function generateLocalResponse(message) {
    const lowerMessage = message.toLowerCase();
    const course = CONFIG.selectedCourse;
    
    if (lowerMessage.includes('carreira') || lowerMessage.includes('mercado') || lowerMessage.includes('trabalho')) {
        return `<strong>💼 Carreira em ${course.nome}</strong><br><br>
        <strong>Mercado de Trabalho:</strong><br>
        • Alta demanda por profissionais qualificados<br>
        • Média salarial inicial: R$ 4.500 - R$ 9.000<br>
        • Taxa de empregabilidade: 85-95% em 6 meses<br><br>
        
        <strong>Áreas de Atuação:</strong><br>
        • Setor privado (empresas, consultorias)<br>
        • Serviço público (concurso, autarquias)<br>
        • Empreendedorismo<br>
        • Pesquisa e desenvolvimento<br><br>
        
        <strong>Dicas:</strong><br>
        • Faça networking durante o curso<br>
        • Participe de estágios<br>
        • Mantenha-se atualizado com as tendências`;
    }
    
    if (lowerMessage.includes('informação') || lowerMessage.includes('sobre') || lowerMessage.includes('curso')) {
        return `<strong>📚 Informações sobre ${course.nome}</strong><br><br>
        <strong>Descrição:</strong><br>
        ${course.descricao || 'Curso de formação superior'}<br><br>
        
        <strong>Duração:</strong><br>
        ${course.duracao || 'Não informado'}<br><br>
        
        <strong>Vagas Disponíveis:</strong><br>
        ${course.vagas || 'Não informado'} vagas<br><br>
        
        <strong>Investimento:</strong><br>
        ${course.investimento || 'Não informado'}<br><br>
        
        <strong>Modalidades:</strong><br>
        ${(course.tags ? (Array.isArray(course.tags) ? course.tags.join(', ') : JSON.parse(course.tags).join(', ')) : 'Não informado')}`;
    }
    
    return `Entendi sua pergunta sobre "${message}".<br><br>
    Em relação ao curso de <strong>${course.nome}</strong>, posso fornecer informações sobre:<br><br>
    1. <strong>Carreira e mercado de trabalho</strong><br>
    2. <strong>Informações detalhadas do curso</strong><br>
    3. <strong>Grade curricular</strong><br>
    4. <strong>Processo seletivo</strong><br><br>
    Use os botões de ações rápidas para obter informações específicas!`;
}

async function saveChatInteraction(pergunta, resposta) {
    try {
        await fetch(`${CONFIG.API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.JWT_TOKEN}`
            },
            body: JSON.stringify({
                usuario_id: CONFIG.currentUser.id,
                curso_id: CONFIG.selectedCourse.id,
                pergunta: pergunta,
                resposta: resposta
            })
        });
    } catch (error) {
        console.error('Erro ao salvar chat:', error);
    }
}

function selectCourse(courseId) {
    // Encontrar o curso selecionado
    const cursoItems = document.querySelectorAll('.curso-item');
    cursoItems.forEach(item => {
        const itemId = item.getAttribute('data-course-id');
        item.classList.toggle('active', itemId === courseId);
        
        if (itemId === courseId) {
            const courseData = {
                id: courseId,
                nome: item.querySelector('h4').textContent,
                descricao: item.querySelector('p').textContent,
                duracao: item.querySelectorAll('small')[0].textContent.replace('⏰ ', ''),
                vagas: parseInt(item.querySelectorAll('small')[1].textContent.replace('👥 ', '')),
                cor: item.querySelector('h4').style.color || '#4361ee',
                tags: Array.from(item.querySelectorAll('.curso-tag')).map(tag => tag.textContent)
            };
            
            CONFIG.selectedCourse = courseData;
            
            // Atualizar header do chat
            document.getElementById('currentCourse').innerHTML = `
                <i class="fas fa-book" style="color: ${courseData.cor}"></i>
                <span>Curso: <strong>${courseData.nome}</strong></span>
            `;
            
            // Adicionar mensagem inicial
            addMessage('assistant', `Você selecionou o curso de <strong>${courseData.nome}</strong>!<br><br>
                <strong>Como posso ajudar?</strong><br>
                • Informações sobre o curso<br>
                • Carreira e mercado de trabalho<br>
                • Grade curricular<br>
                • Processo seletivo`);
        }
    });
}

function addMessage(sender, content) {
    const container = document.getElementById('messagesContainer');
    removeTypingIndicator();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.innerHTML = `
        <div class="message-header">
            <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
            ${sender === 'user' ? CONFIG.currentUser.name : 'Assistente IA'}
        </div>
        <div class="message-content">${content}</div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
    const container = document.getElementById('messagesContainer');
    removeTypingIndicator();
    
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

function quickAction(action) {
    if (!CONFIG.selectedCourse) {
        showNotification('Selecione um curso primeiro!', 'warning');
        return;
    }
    
    const responses = {
        'info': `<strong>📋 Informações Detalhadas - ${CONFIG.selectedCourse.nome}</strong><br><br>
            <strong>Descrição Completa:</strong><br>
            ${CONFIG.selectedCourse.descricao}<br><br>
            
            <strong>Duração:</strong> ${CONFIG.selectedCourse.duracao}<br>
            <strong>Vagas:</strong> ${CONFIG.selectedCourse.vagas} disponíveis<br>
            <strong>Investimento:</strong> ${CONFIG.selectedCourse.investimento || 'Consulte valores'}<br><br>
            
            <strong>Modalidades Disponíveis:</strong><br>
            ${CONFIG.selectedCourse.tags.join(', ')}`,
            
        'career': `<strong>🚀 Carreira em ${CONFIG.selectedCourse.nome}</strong><br><br>
            <strong>Oportunidades no Mercado:</strong><br>
            • Alta empregabilidade na área<br>
            • Crescimento anual de 10-15%<br>
            • Salário inicial médio: R$ 4.500 - R$ 8.000<br><br>
            
            <strong>Áreas de Especialização:</strong><br>
            • Especialização técnica<br>
            • Gestão e liderança<br>
            • Pesquisa e inovação<br>
            • Consultoria<br><br>
            
            <strong>Dicas para Sucesso:</strong><br>
            1. Invista em networking<br>
            2. Faça estágios durante o curso<br>
            3. Participe de eventos da área<br>
            4. Mantenha-se atualizado`
    };
    
    addMessage('assistant', responses[action] || 'Ação não reconhecida.');
}

// ==============================
// FUNÇÕES DO PAINEL ADMIN
// ==============================
async function loadAdminDashboard() {
    try {
        const [statsResponse, activityResponse] = await Promise.all([
            fetch(`${CONFIG.API_BASE_URL}/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${CONFIG.JWT_TOKEN}`
                }
            }),
            fetch(`${CONFIG.API_BASE_URL}/dashboard/activities`, {
                headers: {
                    'Authorization': `Bearer ${CONFIG.JWT_TOKEN}`
                }
            })
        ]);
        
        if (statsResponse.ok && activityResponse.ok) {
            const stats = await statsResponse.json();
            const activities = await activityResponse.json();
            
            displayAdminStats(stats);
            displayRecentActivity(activities);
        } else {
            throw new Error('Erro ao carregar dados');
        }
    } catch (error) {
        console.error('Erro no dashboard:', error);
        displaySampleDashboard();
    }
}

function displayAdminStats(stats) {
    const container = document.getElementById('dashboardStats');
    
    const statCards = [
        {
            icon: 'fas fa-users',
            title: 'Total de Usuários',
            value: stats.total_usuarios || '0',
            color: '#3b82f6'
        },
        {
            icon: 'fas fa-graduation-cap',
            title: 'Cursos Ativos',
            value: stats.total_cursos || '0',
            color: '#10b981'
        },
        {
            icon: 'fas fa-comments',
            title: 'Interações IA',
            value: stats.total_interacoes || '0',
            color: '#8b5cf6'
        },
        {
            icon: 'fas fa-chart-line',
            title: 'Taxa de Engajamento',
            value: stats.taxa_engajamento || '0%',
            color: '#f59e0b'
        }
    ];
    
    container.innerHTML = statCards.map(stat => `
        <div class="stat-card">
            <i class="${stat.icon}" style="color: ${stat.color}"></i>
            <div>
                <h3>${stat.title}</h3>
                <div class="value">${stat.value}</div>
                <div class="trend up">
                    <i class="fas fa-arrow-up"></i> Crescimento
                </div>
            </div>
        </div>
    `).join('');
}

function displayRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    
    if (!activities || activities.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--secondary);">Nenhuma atividade recente</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="activity-list">
            ${activities.slice(0, 5).map(activity => `
                <div class="activity-item">
                    <i class="fas fa-${activity.type === 'chat' ? 'comment' : 'user'} 
                       text-${activity.type === 'chat' ? 'primary' : 'success'}"></i>
                    <div>
                        <strong>${activity.title || 'Atividade'}</strong>
                        <p>${activity.description || 'Sem descrição'}</p>
                        <small>${new Date(activity.timestamp).toLocaleString('pt-BR')}</small>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function displaySampleDashboard() {
    document.getElementById('dashboardStats').innerHTML = `
        <div class="stat-card">
            <i class="fas fa-users" style="color: #3b82f6"></i>
            <div>
                <h3>Total de Usuários</h3>
                <div class="value">12</div>
                <div class="trend up">
                    <i class="fas fa-arrow-up"></i> +2 hoje
                </div>
            </div>
        </div>
        
        <div class="stat-card">
            <i class="fas fa-graduation-cap" style="color: #10b981"></i>
            <div>
                <h3>Cursos Ativos</h3>
                <div class="value">6</div>
                <div class="trend up">
                    <i class="fas fa-arrow-up"></i> +1 esta semana
                </div>
            </div>
        </div>
        
        <div class="stat-card">
            <i class="fas fa-comments" style="color: #8b5cf6"></i>
            <div>
                <h3>Interações IA</h3>
                <div class="value">47</div>
                <div class="trend up">
                    <i class="fas fa-arrow-up"></i> +28% esta semana
                </div>
            </div>
        </div>
        
        <div class="stat-card">
            <i class="fas fa-chart-line" style="color: #f59e0b"></i>
            <div>
                <h3>Taxa de Engajamento</h3>
                <div class="value">84%</div>
                <div class="trend up">
                    <i class="fas fa-arrow-up"></i> +5%
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('recentActivity').innerHTML = `
        <div class="activity-list">
            <div class="activity-item">
                <i class="fas fa-user text-success"></i>
                <div>
                    <strong>Novo usuário registrado</strong>
                    <p>Maria Silva se cadastrou no sistema</p>
                    <small>${new Date().toLocaleTimeString('pt-BR')}</small>
                </div>
            </div>
            <div class="activity-item">
                <i class="fas fa-comment text-primary"></i>
                <div>
                    <strong>Interação no chat</strong>
                    <p>João perguntou sobre Medicina</p>
                    <small>${new Date(Date.now() - 3600000).toLocaleTimeString('pt-BR')}</small>
                </div>
            </div>
        </div>
    `;
}

async function loadAdminCourses() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/cursos`, {
            headers: {
                'Authorization': `Bearer ${CONFIG.JWT_TOKEN}`
            }
        });
        
        if (response.ok) {
            const cursos = await response.json();
            displayAdminCourses(cursos);
        } else {
            throw new Error('Erro ao carregar cursos');
        }
    } catch (error) {
        console.error('Erro ao carregar cursos:', error);
        displayAdminCourses(getSampleCourses());
    }
}

function displayAdminCourses(cursos) {
    const tbody = document.getElementById('coursesTableBody');
    
    if (!cursos || cursos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--secondary);">
                    <i class="fas fa-book" style="font-size: 32px; margin-bottom: 16px; display: block;"></i>
                    Nenhum curso cadastrado ainda.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = cursos.map(course => `
        <tr>
            <td>${course.id}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${course.cor || '#4361ee'};"></div>
                    <strong>${course.nome}</strong>
                </div>
                <small style="color: var(--secondary);">${course.descricao?.substring(0, 50) || 'Sem descrição'}...</small>
            </td>
            <td>${course.duracao || 'N/I'}</td>
            <td>${course.vagas || '0'}</td>
            <td>${course.investimento || 'N/I'}</td>
            <td>
                <span class="badge ${course.ativo !== false ? 'badge-success' : 'badge-danger'}">
                    ${course.ativo !== false ? 'Ativo' : 'Inativo'}
                </span>
            </td>
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
    `).join('');
}

function showAddCourseModal() {
    CONFIG.editingCourseId = null;
    document.getElementById('modalTitle').textContent = 'Adicionar Novo Curso';
    document.getElementById('courseModal').style.display = 'flex';
    
    // Limpar formulário
    document.getElementById('courseName').value = '';
    document.getElementById('courseDescription').value = '';
    document.getElementById('courseDuration').value = '';
    document.getElementById('courseSlots').value = '';
    document.getElementById('courseInvestment').value = '';
    document.getElementById('courseCareer').value = '';
    document.getElementById('courseTags').value = '';
    document.getElementById('courseColor').value = '#4361ee';
    document.getElementById('courseColorHex').value = '#4361ee';
}

function closeCourseModal() {
    document.getElementById('courseModal').style.display = 'none';
}

async function saveCourse() {
    const courseData = {
        nome: document.getElementById('courseName').value.trim(),
        descricao: document.getElementById('courseDescription').value.trim(),
        duracao: document.getElementById('courseDuration').value.trim(),
        vagas: parseInt(document.getElementById('courseSlots').value) || 0,
        investimento: document.getElementById('courseInvestment').value.trim(),
        carreira: document.getElementById('courseCareer').value.trim(),
        tags: document.getElementById('courseTags').value.split(',').map(tag => tag.trim()),
        cor: document.getElementById('courseColorHex').value.trim(),
        ativo: true
    };
    
    // Validação básica
    if (!courseData.nome || !courseData.descricao) {
        showNotification('Preencha pelo menos nome e descrição', 'error');
        return;
    }
    
    try {
        const url = CONFIG.editingCourseId 
            ? `${CONFIG.API_BASE_URL}/cursos/${CONFIG.editingCourseId}`
            : `${CONFIG.API_BASE_URL}/cursos`;
        
        const method = CONFIG.editingCourseId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.JWT_TOKEN}`
            },
            body: JSON.stringify(courseData)
        });
        
        if (response.ok) {
            showNotification(
                CONFIG.editingCourseId ? 'Curso atualizado!' : 'Curso adicionado!', 
                'success'
            );
            
            closeCourseModal();
            loadAdminCourses();
            
            // Se for usuário, atualizar a lista de cursos também
            if (!CONFIG.isAdmin) {
                loadCoursesFromAPI();
            }
        } else {
            throw new Error('Erro ao salvar curso');
        }
    } catch (error) {
        console.error('Erro ao salvar curso:', error);
        showNotification('Erro ao salvar curso', 'error');
    }
}

async function editCourse(courseId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/cursos/${courseId}`, {
            headers: {
                'Authorization': `Bearer ${CONFIG.JWT_TOKEN}`
            }
        });
        
        if (response.ok) {
            const course = await response.json();
            CONFIG.editingCourseId = courseId;
            
            document.getElementById('modalTitle').textContent = 'Editar Curso';
            document.getElementById('courseModal').style.display = 'flex';
            
            // Preencher formulário
            document.getElementById('courseName').value = course.nome || '';
            document.getElementById('courseDescription').value = course.descricao || '';
            document.getElementById('courseDuration').value = course.duracao || '';
            document.getElementById('courseSlots').value = course.vagas || '';
            document.getElementById('courseInvestment').value = course.investimento || '';
            document.getElementById('courseCareer').value = course.carreira || '';
            document.getElementById('courseTags').value = Array.isArray(course.tags) 
                ? course.tags.join(', ') 
                : (course.tags ? JSON.parse(course.tags).join(', ') : '');
            document.getElementById('courseColor').value = course.cor || '#4361ee';
            document.getElementById('courseColorHex').value = course.cor || '#4361ee';
        }
    } catch (error) {
        console.error('Erro ao carregar curso:', error);
        showNotification('Erro ao carregar curso', 'error');
    }
}

async function deleteCourse(courseId) {
    if (!confirm('Tem certeza que deseja excluir este curso? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/cursos/${courseId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${CONFIG.JWT_TOKEN}`
            }
        });
        
        if (response.ok) {
            showNotification('Curso excluído com sucesso!', 'success');
            loadAdminCourses();
        } else {
            throw new Error('Erro ao excluir curso');
        }
    } catch (error) {
        console.error('Erro ao excluir curso:', error);
        showNotification('Erro ao excluir curso', 'error');
    }
}

function refreshCourses() {
    if (CONFIG.isAdmin) {
        loadAdminCourses();
    } else {
        loadCoursesFromAPI();
    }
    showNotification('Lista de cursos atualizada!', 'success');
}

// ==============================
// CONFIGURAÇÕES DA IA
// ==============================
function checkAIConfig() {
    const badge = document.getElementById('apiStatusBadge');
    
    if (CONFIG.OPENROUTER_API_KEY) {
        badge.className = 'badge badge-success';
        badge.innerHTML = '<i class="fas fa-plug"></i> IA: CONECTADA';
        badge.title = 'OpenRouter API configurada';
    } else {
        badge.className = 'badge badge-warning';
        badge.innerHTML = '<i class="fas fa-plug"></i> IA: LOCAL';
        badge.title = 'Usando respostas locais - Configure a API';
    }
}

function checkAIConfigAdmin() {
    const badge = document.getElementById('apiStatusAdmin');
    const aiStatus = document.getElementById('aiStatus');
    
    if (CONFIG.OPENROUTER_API_KEY) {
        badge.className = 'badge badge-success';
        badge.innerHTML = '<i class="fas fa-plug"></i> IA: CONECTADA';
        
        aiStatus.innerHTML = `
            <i class="fas fa-check-circle" style="color: var(--success);"></i>
            <span>OpenRouter API: CONECTADA</span>
        `;
        aiStatus.className = 'api-status connected';
    } else {
        badge.className = 'badge badge-warning';
        badge.innerHTML = '<i class="fas fa-plug"></i> IA: NÃO CONFIGURADA';
        
        aiStatus.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="color: var(--warning);"></i>
            <span>OpenRouter API: NÃO CONFIGURADA</span>
        `;
        aiStatus.className = 'api-status disconnected';
    }
}

function loadSavedSettings() {
    // Carregar configurações salvas
    document.getElementById('openrouterKey').value = CONFIG.OPENROUTER_API_KEY;
    document.getElementById('aiModel').value = CONFIG.AI_MODEL;
    document.getElementById('tempRange').value = CONFIG.AI_TEMPERATURE;
    document.getElementById('tempValue').textContent = CONFIG.AI_TEMPERATURE;
    document.getElementById('apiUrl').value = CONFIG.API_BASE_URL;
}

function loadAIConfigPage() {
    loadSavedSettings();
    
    // Atualizar estatísticas da IA
    updateAIStats();
}

function saveOpenRouterKey() {
    const apiKey = document.getElementById('openrouterKey').value.trim();
    
    if (!apiKey) {
        showNotification('Digite uma chave API válida', 'error');
        return;
    }
    
    CONFIG.OPENROUTER_API_KEY = apiKey;
    localStorage.setItem('openrouter_api_key', apiKey);
    
    showNotification('Chave OpenRouter salva com sucesso!', 'success');
    checkAIConfigAdmin();
    checkAIConfig();
}

async function testOpenRouter() {
    if (!CONFIG.OPENROUTER_API_KEY) {
        showNotification('Configure a chave API primeiro', 'error');
        return;
    }
    
    showNotification('Testando conexão com OpenRouter...', 'info');
    
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${CONFIG.OPENROUTER_API_KEY}`
            }
        });
        
        if (response.ok) {
            showNotification('✅ Conexão com OpenRouter estabelecida!', 'success');
        } else {
            throw new Error('API não respondeu');
        }
    } catch (error) {
        showNotification('❌ Falha na conexão com OpenRouter', 'error');
    }
}

function saveAISettings() {
    const model = document.getElementById('aiModel').value;
    const temperature = parseFloat(document.getElementById('tempRange').value);
    
    CONFIG.AI_MODEL = model;
    CONFIG.AI_TEMPERATURE = temperature;
    
    localStorage.setItem('ai_model', model);
    localStorage.setItem('ai_temperature', temperature.toString());
    
    showNotification('Configurações da IA salvas com sucesso!', 'success');
}

function updateAIStats() {
    // Aqui você pode implementar a lógica para buscar estatísticas reais da IA
    // Por enquanto, vamos usar valores de exemplo
    document.getElementById('aiResponses').textContent = '24';
    document.getElementById('aiTokens').textContent = '15,842';
    document.getElementById('aiSuccessRate').textContent = '92%';
}

function clearAIStats() {
    if (confirm('Limpar estatísticas de uso da IA?')) {
        document.getElementById('aiResponses').textContent = '0';
        document.getElementById('aiTokens').textContent = '0';
        document.getElementById('aiSuccessRate').textContent = '0%';
        showNotification('Estatísticas da IA limpas!', 'success');
    }
}

// ==============================
// OUTRAS FUNÇÕES ADMIN
// ==============================
async function testDatabase() {
    showNotification('Testando conexão com o banco de dados...', 'info');
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/health`);
        
        if (response.ok) {
            const dbStatus = document.getElementById('dbStatus');
            dbStatus.innerHTML = `
                <i class="fas fa-check-circle" style="color: var(--success);"></i>
                <span>Neon PostgreSQL: CONECTADO</span>
            `;
            dbStatus.className = 'api-status connected';
            showNotification('✅ Banco de dados conectado com sucesso!', 'success');
        } else {
            throw new Error('Banco não respondeu');
        }
    } catch (error) {
        const dbStatus = document.getElementById('dbStatus');
        dbStatus.innerHTML = `
            <i class="fas fa-times-circle" style="color: var(--danger);"></i>
            <span>Neon PostgreSQL: DESCONECTADO</span>
        `;
        dbStatus.className = 'api-status disconnected';
        showNotification('❌ Falha na conexão com o banco de dados', 'error');
    }
}

function updateApiUrl() {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    
    if (!apiUrl) {
        showNotification('Digite uma URL válida', 'error');
        return;
    }
    
    CONFIG.API_BASE_URL = apiUrl;
    localStorage.setItem('api_url', apiUrl);
    
    showNotification('URL da API atualizada!', 'success');
}

async function loadAdminUsers() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/usuarios`, {
            headers: {
                'Authorization': `Bearer ${CONFIG.JWT_TOKEN}`
            }
        });
        
        if (response.ok) {
            const usuarios = await response.json();
            displayAdminUsers(usuarios);
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        displayAdminUsers([]);
    }
}

function displayAdminUsers(usuarios) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--secondary);">
                    <i class="fas fa-users" style="font-size: 32px; margin-bottom: 16px; display: block;"></i>
                    Nenhum usuário cadastrado.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = usuarios.map(user => `
        <tr>
            <td>${user.id || 'N/I'}</td>
            <td>${user.nome || 'N/I'}</td>
            <td>${user.email || 'N/I'}</td>
            <td>
                <span class="badge ${user.role === 'admin' ? 'badge-danger' : 'badge-primary'}">
                    ${user.role === 'admin' ? 'Administrador' : 'Usuário'}
                </span>
            </td>
            <td>${user.last_login ? new Date(user.last_login).toLocaleDateString('pt-BR') : 'Nunca'}</td>
            <td>
                <span class="badge ${user.ativo !== false ? 'badge-success' : 'badge-danger'}">
                    ${user.ativo !== false ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="editUser('${user.id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function resetPasswords() {
    if (confirm('Resetar todas as senhas para o padrão? Isso afetará todos os usuários.')) {
        showNotification('Função de reset de senhas em desenvolvimento', 'info');
    }
}

// ==============================
// FUNÇÕES DO USUÁRIO
// ==============================
function loadUserCatalog() {
    // Implementar carregamento do catálogo completo
    loadCoursesFromAPI();
}

// ==============================
// FUNÇÕES UTILITÁRIAS
// ==============================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 
                         type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function checkAPIStatus() {
    const badge = document.getElementById('apiStatusBadge');
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/health`);
        
        if (response.ok) {
            badge.className = 'badge badge-success';
            badge.innerHTML = '<i class="fas fa-plug"></i> API: ONLINE';
        } else {
            throw new Error('API offline');
        }
    } catch (error) {
        badge.className = 'badge badge-danger';
        badge.innerHTML = '<i class="fas fa-plug"></i> API: OFFLINE';
    }
}

async function checkAPIStatusAdmin() {
    const badge = document.getElementById('apiStatusAdmin');
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/health`);
        
        if (response.ok) {
            badge.className = 'badge badge-success';
            badge.innerHTML = '<i class="fas fa-plug"></i> API: ONLINE';
        } else {
            throw new Error('API offline');
        }
    } catch (error) {
        badge.className = 'badge badge-danger';
        badge.innerHTML = '<i class="fas fa-plug"></i> API: OFFLINE';
    }
}

function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        CONFIG.currentUser = null;
        CONFIG.isAdmin = false;
        
        // Esconder ambos os apps
        document.getElementById('appUser').style.display = 'none';
        document.getElementById('appAdmin').style.display = 'none';
        
        // Mostrar login
        document.getElementById('loginPage').style.display = 'block';
        
        showNotification('Logout realizado com sucesso!', 'success');
    }
}

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
});
