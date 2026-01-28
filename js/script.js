// js/script.js - Frontend atualizado para usar API/Neon Database

// ==============================
// CONFIGURAÇÕES GLOBAIS
// ==============================
const API_BASE_URL = 'http://localhost:3000/api'; // Ou sua URL de deployment
let currentUser = null;
let isAdmin = false;
let currentPage = 'dashboard';
let selectedCourse = null;

// ==============================
// FUNÇÕES DE LOGIN COM API
// ==============================
function showTab(tabId, element) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    element.classList.add('active');
    document.getElementById(tabId + 'Tab').style.display = 'block';
}

async function loginAsUser() {
    const username = document.getElementById('username').value.trim() || 'Visitante';
    const password = document.getElementById('userPass').value.trim();
    
    if (!username || !password) {
        alert('Digite nome de usuário e senha');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username.toLowerCase(),
                password: password,
                isAdmin: false
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            isAdmin = false;
            startApp();
        } else {
            alert(data.message || 'Credenciais inválidas');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro ao conectar ao servidor');
    }
}

async function loginAsAdmin() {
    const username = document.getElementById('adminUser').value.trim();
    const password = document.getElementById('adminPass').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username.toLowerCase(),
                password: password,
                isAdmin: true
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            isAdmin = true;
            startApp();
        } else {
            alert(data.message || 'Credenciais inválidas');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro ao conectar ao servidor');
    }
}

// ==============================
// INICIALIZAÇÃO DO APP
// ==============================
async function startApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    
    updateUserInfo();
    checkAPIStatus();
    loadDashboard();
    loadCoursesFromAPI();
    setupNavigation();
    setupChatEvents();
}

function updateUserInfo() {
    if (!currentUser) return;
    
    document.getElementById('userAvatar').textContent = currentUser.avatar;
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role;
    document.getElementById('userFullName').textContent = currentUser.name;
    document.getElementById('welcomeMessage').innerHTML = 
        `Bem-vindo de volta, <strong>${currentUser.name}</strong>!`;
    
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? 'flex' : 'none';
    });
}

// ==============================
// CARREGAR DADOS DA API
// ==============================
async function loadCoursesFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/cursos`);
        const cursos = await response.json();
        
        const container = document.getElementById('cursosContainer');
        container.innerHTML = cursos.map(course => `
            <div class="curso-item" data-course-id="${course.id}" onclick="selectCourseFromAPI(${course.id})">
                <h4 style="color: ${course.cor}">${course.nome}</h4>
                <p>${course.descricao}</p>
                <div class="curso-tags">
                    ${JSON.parse(course.tags || '[]').map(tag => `<span class="curso-tag">${tag}</span>`).join('')}
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 12px;">
                    <small><i class="fas fa-clock"></i> ${course.duracao}</small>
                    <small><i class="fas fa-users"></i> ${course.vagas} vagas</small>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar cursos:', error);
        // Fallback para dados locais se API falhar
        loadLocalCourses();
    }
}

async function selectCourseFromAPI(courseId) {
    try {
        const response = await fetch(`${API_BASE_URL}/cursos`);
        const cursos = await response.json();
        const curso = cursos.find(c => c.id === courseId);
        
        if (!curso) return;
        
        // Remove active de todos os cursos
        document.querySelectorAll('.curso-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Adiciona active ao curso selecionado
        const cursoItem = document.querySelector(`[data-course-id="${courseId}"]`);
        if (cursoItem) {
            cursoItem.classList.add('active');
        }
        
        selectedCourse = curso;
        
        // Atualiza header do chat
        const currentCourseEl = document.getElementById('currentCourse');
        currentCourseEl.innerHTML = `
            <i class="fas fa-book" style="color: ${curso.cor}"></i>
            <span>Curso selecionado: <strong>${curso.nome}</strong></span>
        `;
        
        // Adiciona mensagem inicial
        addMessage('assistant', `Ótima escolha! Você selecionou o curso de <strong>${curso.nome}</strong>.<br><br>
            <strong>Informações do curso:</strong><br>
            • Duração: ${curso.duracao}<br>
            • Vagas disponíveis: ${curso.vagas}<br>
            • Investimento: ${curso.investimento}<br>
            • Modalidade: ${JSON.parse(curso.tags || '[]').join(', ')}<br><br>
            Como posso ajudar com esse curso?`);
        
        updateQuickActions();
    } catch (error) {
        console.error('Erro ao selecionar curso:', error);
    }
}

// ==============================
// DASHBOARD COM API
// ==============================
async function loadDashboard() {
    try {
        const [statsResponse, atividadesResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/dashboard/stats`),
            fetch(`${API_BASE_URL}/dashboard/atividades`)
        ]);
        
        const stats = await statsResponse.json();
        const atividades = await atividadesResponse.json();
        
        // Atualizar estatísticas
        const statsContainer = document.getElementById('dashboardStats');
        const dashboardStats = [
            {
                icon: 'fas fa-users',
                title: 'Total de Usuários',
                value: stats.total_usuarios || '0',
                trend: '+12%',
                trendUp: true,
                color: 'var(--primary)'
            },
            {
                icon: 'fas fa-graduation-cap',
                title: 'Cursos Ativos',
                value: stats.total_cursos || '0',
                trend: '+3',
                trendUp: true,
                color: 'var(--success)'
            },
            {
                icon: 'fas fa-comments',
                title: 'Interações IA',
                value: stats.total_interacoes || '0',
                trend: '+28%',
                trendUp: true,
                color: 'var(--info)'
            },
            {
                icon: 'fas fa-star',
                title: 'Média Feedback',
                value: stats.media_feedback || '0.0',
                trend: '+0.5',
                trendUp: true,
                color: 'var(--warning)'
            }
        ];
        
        statsContainer.innerHTML = dashboardStats.map(stat => `
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
        
        // Atualizar atividades recentes
        const atividadesContainer = document.querySelector('#dashboardPage .admin-section:last-child p');
        atividadesContainer.innerHTML = atividades.length > 0 ? `
            <div class="activity-list">
                ${atividades.map(atividade => `
                    <div class="activity-item">
                        <i class="fas fa-${atividade.tipo === 'chat' ? 'comment' : 'star'} text-${atividade.tipo === 'chat' ? 'primary' : 'warning'}"></i>
                        <div>
                            <strong>${atividade.tipo === 'chat' ? 'Interação no chat' : 'Novo feedback'}</strong>
                            <p>${atividade.descricao?.substring(0, 60)}...</p>
                            <small>${new Date(atividade.created_at).toLocaleString()}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : '<p style="text-align: center; color: var(--secondary);">Nenhuma atividade recente</p>';
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        // Fallback para dados locais
        loadLocalDashboard();
    }
}

// ==============================
// FUNÇÕES DO CHAT COM API
// ==============================
async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (!selectedCourse) {
        alert('Selecione um curso primeiro!');
        return;
    }
    
    // Adiciona mensagem do usuário
    addMessage('user', message);
    
    // Limpar input
    input.value = '';
    input.style.height = 'auto';
    
    // Mostrar indicador de digitação
    showTypingIndicator();
    
    try {
        // Gerar resposta da IA (usando sua função existente)
        const aiResponse = await generateAIResponse(message);
        
        // Adicionar resposta
        addMessage('assistant', aiResponse);
        
        // Salvar no banco de dados
        await saveChatToDatabase(message, aiResponse);
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        addMessage('assistant', 'Desculpe, ocorreu um erro ao processar sua mensagem.');
    } finally {
        removeTypingIndicator();
    }
}

async function saveChatToDatabase(pergunta, resposta) {
    try {
        await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario_id: currentUser.id,
                curso_id: selectedCourse.id,
                pergunta: pergunta,
                resposta: resposta
            })
        });
    } catch (error) {
        console.error('Erro ao salvar chat:', error);
    }
}

// ==============================
// PÁGINA DE FEEDBACK COM API
// ==============================
async function loadFeedbackPage() {
    try {
        const response = await fetch(`${API_BASE_URL}/feedback`);
        const feedbacks = await response.json();
        
        const container = document.getElementById('feedbackPage');
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
                                      placeholder="Compartilhe sua experiência..."></textarea>
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
                                        <strong>Usuário ${feedback.usuario_id}</strong>
                                        <div>
                                            ${Array(feedback.rating).fill().map(() => 
                                                '<i class="fas fa-star text-warning"></i>'
                                            ).join('')}
                                        </div>
                                    </div>
                                    <p class="mt-1">${feedback.comentario}</p>
                                    <small style="color: var(--secondary);">${new Date(feedback.created_at).toLocaleDateString()}</small>
                                </div>
                            `).join('') || '<p>Nenhum feedback ainda</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar feedback:', error);
    }
}

async function submitFeedback() {
    const stars = document.querySelectorAll('.star.active');
    const rating = stars.length;
    const comment = document.getElementById('feedbackComment').value.trim();
    
    if (rating === 0 || !comment) {
        alert('Por favor, selecione uma avaliação e escreva um comentário');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario_id: currentUser.id,
                curso_id: selectedCourse?.id || null,
                rating: rating,
                comentario: comment
            })
        });
        
        if (response.ok) {
            alert('Feedback enviado com sucesso!');
            loadFeedbackPage();
        }
    } catch (error) {
        console.error('Erro ao enviar feedback:', error);
        alert('Erro ao enviar feedback');
    }
}

// ==============================
// FUNÇÕES AUXILIARES
// ==============================
function checkAPIStatus() {
    const badge = document.getElementById('apiStatusBadge');
    
    fetch(`${API_BASE_URL}/health`)
        .then(response => {
            if (response.ok) {
                badge.className = 'badge badge-success';
                badge.innerHTML = '<i class="fas fa-plug"></i> API: ONLINE';
            } else {
                throw new Error('API não respondeu');
            }
        })
        .catch(error => {
            console.warn('API offline:', error);
            badge.className = 'badge badge-danger';
            badge.innerHTML = '<i class="fas fa-plug"></i> API: OFFLINE';
        });
}

// Fallback para dados locais (caso API falhe)
function loadLocalCourses() {
    // Sua implementação local existente...
}

function loadLocalDashboard() {
    // Sua implementação local existente...
}

// ==============================
// NAVEGAÇÃO
// ==============================
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(i => {
                i.classList.remove('active');
            });
            
            this.classList.add('active');
            
            const page = this.getAttribute('data-page');
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    const pageElement = document.getElementById(page + 'Page');
    if (pageElement) {
        pageElement.classList.add('active');
        currentPage = page;
        
        switch(page) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'ia':
                loadChatPage();
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
// LOGOUT
// ==============================
function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        currentUser = null;
        isAdmin = false;
        document.getElementById('app').style.display = 'none';
        document.getElementById('loginPage').style.display = 'block';
        
        // Resetar tabs
        showTab('user', document.querySelector('.tab-btn'));
    }
}

// ==============================
// INICIALIZAÇÃO
// ==============================
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se há usuário na sessão
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        isAdmin = currentUser.role === 'admin';
        startApp();
    }
});
