// ==============================
// CONFIGURAÇÕES GLOBAIS
// ==============================
let currentUser = null;
let currentCourse = null;
let isTyping = false;
let API_BASE_URL = 'http://localhost:3000/api'; // Ajuste conforme necessário

// ==============================
// AUTENTICAÇÃO E SESSÃO
// ==============================
async function initDatabase() {
    // Verificar se há usuário salvo
    const savedUser = localStorage.getItem('assistance_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        // Verificar se token ainda é válido
        await validateToken();
    }
}

async function validateToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/validate`, {
            headers: {
                'Authorization': `Bearer ${currentUser?.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Token inválido');
        }
        
        return true;
    } catch (error) {
        logout();
        return false;
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
    const password = document.getElementById('password')?.value.trim();
    
    if (!username) {
        showNotification('Digite um nome de usuário', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password || 'default' // Para usuários simples sem senha
            })
        });
        
        if (!response.ok) {
            throw new Error('Credenciais inválidas');
        }
        
        const userData = await response.json();
        
        currentUser = {
            ...userData,
            token: userData.token
        };
        
        localStorage.setItem('assistance_user', JSON.stringify(currentUser));
        localStorage.setItem('auth_token', userData.token);
        
        await showMainSystem();
        showNotification(`Bem-vindo, ${userData.nome || username}!`, 'success');
        
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
        const response = await fetch(`${API_BASE_URL}/auth/login-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Credenciais inválidas');
        }
        
        const userData = await response.json();
        
        if (userData.role !== 'admin') {
            showNotification('Acesso apenas para administradores', 'error');
            return;
        }
        
        currentUser = {
            ...userData,
            token: userData.token,
            isAdmin: true
        };
        
        localStorage.setItem('assistance_user', JSON.stringify(currentUser));
        localStorage.setItem('auth_token', userData.token);
        
        await showMainSystem();
        showNotification(`Bem-vindo, Admin ${userData.nome || username}!`, 'success');
        
    } catch (error) {
        console.error('Erro no login admin:', error);
        showNotification(error.message || 'Erro ao fazer login', 'error');
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
    const mobileToggle = document.querySelector('.mobile-toggle') || document.createElement('button');
    mobileToggle.className = 'mobile-toggle';
    mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
    mobileToggle.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('active');
    });
    
    if (!document.querySelector('.mobile-toggle')) {
        document.querySelector('.main-content').prepend(mobileToggle);
    }
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
            if (currentUser?.role === 'admin') {
                loadCoursesManagement();
            } else {
                showPage('dashboard');
            }
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
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar dashboard');
        }
        
        const stats = await response.json();
        updateDashboardStats(stats);
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showNotification('Erro ao carregar dashboard', 'error');
        
        // Fallback para dados locais
        updateDashboardStats({
            totalUsers: 0,
            activeCourses: 0,
            feedbacks: 0,
            activeSessions: 0
        });
    }
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
// CHAT IA COM INTEGRAÇÃO REAL
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
    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/courses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar cursos');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar cursos:', error);
        return [];
    }
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
        <div class="curso-item" data-course-id="${course.id}" onclick="selectCourse('${course.id}', '${course.name.replace(/'/g, "\\'")}')">
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

function selectCourse(courseId, courseName) {
    // Encontrar curso selecionado
    const courses = document.querySelectorAll('.curso-item');
    courses.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-course-id') === courseId) {
            item.classList.add('active');
            currentCourse = {
                id: courseId,
                name: courseName
            };
            
            // Atualizar header do chat
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
        <div class="message-content">${formatMessage(content)}</div>
        ${actionsHTML}
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    return messageDiv;
}

function formatMessage(content) {
    // Converter markdown simples para HTML
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\s*[-*]\s+(.*?)$/gm, '• $1<br>');
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
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: message,
                courseId: currentCourse.id,
                courseName: currentCourse.name,
                userId: currentUser?.id
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro na resposta da IA');
        }
        
        const data = await response.json();
        
        // Adicionar resposta com botões de ação
        addMessage('assistant', data.response, true);
        
        // Salvar no histórico
        await saveChatHistory(message, data.response);
        
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

async function saveChatHistory(userMessage, aiResponse) {
    try {
        const token = localStorage.getItem('auth_token');
        await fetch(`${API_BASE_URL}/chat/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userId: currentUser?.id,
                courseId: currentCourse.id,
                userMessage: userMessage,
                aiResponse: aiResponse
            })
        });
    } catch (error) {
        console.error('Erro ao salvar histórico:', error);
    }
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

function copyToClipboard(button) {
    const messageContent = button.closest('.message').querySelector('.message-content');
    const text = messageContent.textContent || messageContent.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        button.classList.remove('btn-success');
        button.classList.add('btn-primary');
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
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
        .replace(/\*\*(.*?)\*\*/g, '*$1*')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    
    if (navigator.share) {
        navigator.share({
            title: `Informações do Curso - ${currentCourse?.name}`,
            text: text,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            button.classList.remove('btn-info');
            button.classList.add('btn-success');
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('btn-success');
                button.classList.add('btn-info');
            }, 2000);
        });
    }
}

// ==============================
// GESTÃO DE CURSOS (APENAS ADMIN)
// ==============================
async function loadCoursesManagement() {
    if (currentUser?.role !== 'admin') {
        showNotification('Acesso restrito a administradores', 'error');
        showPage('dashboard');
        return;
    }
    
    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/admin/courses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar cursos');
        }
        
        const courses = await response.json();
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
                                <td><span class="badge ${course.active ? 'badge-success' : 'badge-secondary'}">
                                    ${course.active ? 'Ativo' : 'Inativo'}
                                </span></td>
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
                    <label class="form-label">Nome do Curso *</label>
                    <input type="text" id="courseName" class="form-control" required>
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">Duração *</label>
                    <input type="text" id="courseDuration" class="form-control" required>
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">Ícone (FontAwesome)</label>
                    <input type="text" id="courseIcon" class="form-control" placeholder="fas fa-book" value="fas fa-book">
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">Descrição *</label>
                    <textarea id="courseDescription" class="form-control" rows="3" required></textarea>
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">Preço Mensal (R$) *</label>
                    <input type="number" id="coursePrice" class="form-control" step="0.01" required>
                </div>
                
                <div class="form-check" style="margin-top: 16px;">
                    <input type="checkbox" id="courseActive" class="form-check-input" checked>
                    <label class="form-check-label" for="courseActive">
                        Curso ativo
                    </label>
                </div>
                
                <div style="margin-top: 32px; display: flex; gap: 12px; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">
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

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
}

async function saveCourse() {
    try {
        const courseData = {
            name: document.getElementById('courseName').value,
            duration: document.getElementById('courseDuration').value,
            icon: document.getElementById('courseIcon').value,
            description: document.getElementById('courseDescription').value,
            price: parseFloat(document.getElementById('coursePrice').value),
            active: document.getElementById('courseActive').checked
        };
        
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/admin/courses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(courseData)
        });
        
        if (!response.ok) {
            throw new Error('Erro ao salvar curso');
        }
        
        closeModal();
        showNotification('Curso salvo com sucesso!', 'success');
        loadCoursesManagement();
        
    } catch (error) {
        console.error('Erro ao salvar curso:', error);
        showNotification('Erro ao salvar curso', 'error');
    }
}

async function deleteCourse(courseId) {
    if (!confirm('Tem certeza que deseja excluir este curso?')) return;
    
    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao excluir curso');
        }
        
        showNotification('Curso excluído com sucesso!', 'success');
        loadCoursesManagement();
        
    } catch (error) {
        console.error('Erro ao excluir curso:', error);
        showNotification('Erro ao excluir curso', 'error');
    }
}

// ==============================
// FEEDBACKS
// ==============================
async function loadFeedbacks() {
    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/feedbacks`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar feedbacks');
        }
        
        const feedbacks = await response.json();
        displayFeedbacks(feedbacks);
        
    } catch (error) {
        console.error('Erro ao carregar feedbacks:', error);
        displayFeedbacks([]);
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
                                    <strong>${feedback.userName || 'Usuário'}</strong>
                                    <div style="color: var(--warning); margin-top: 4px;">
                                        ${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}
                                    </div>
                                </div>
                                <small style="color: var(--secondary);">
                                    ${new Date(feedback.createdAt).toLocaleDateString('pt-BR')}
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
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/feedbacks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                rating: currentRating,
                comment: text,
                userId: currentUser?.id
            })
        });
        
        if (!response.ok) {
            throw new Error('Erro ao enviar feedback');
        }
        
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
                    <li><strong>Assistente IA Avançado:</strong> Chatbot inteligente para suporte e vendas de cursos</li>
                    <li><strong>Sistema de Feedback:</strong> Avaliação e coleta de opiniões dos usuários em tempo real</li>
                    <li><strong>Gestão de Cursos:</strong> CRUD completo com integração ao banco de dados</li>
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
                            <strong>Banco de Dados:</strong> PostgreSQL (Neon)
                        </div>
                        <div>
                            <strong>Backend API:</strong> Node.js + Express
                        </div>
                        <div>
                            <strong>IA:</strong> OpenRouter API
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
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto-remover após duração
    setTimeout(() => {
        notification.classList.remove('show');
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
        // Limpar dados locais
        localStorage.removeItem('assistance_user');
        localStorage.removeItem('auth_token');
        
        // Resetar estado
        currentUser = null;
        currentCourse = null;
        
        // Voltar para login
        document.getElementById('app').style.display = 'none';
        document.getElementById('loginPage').style.display = 'flex';
        
        // Limpar formulários
        document.getElementById('username').value = '';
        document.getElementById('adminUser').value = '';
        document.getElementById('adminPass').value = '';
        
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
window.closeModal = closeModal;
window.saveCourse = saveCourse;
window.deleteCourse = deleteCourse;
window.editCourse = editCourse;
