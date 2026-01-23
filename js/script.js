// ==============================
// CONFIGURAÇÕES GLOBAIS
// ==============================
let currentUser = null;
let currentCourse = null;
let isTyping = false;

// Configuração da API - ajuste conforme seu deployment
let API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://seu-dominio.com/api';

// Configuração OpenRouter
const OPENROUTER_API_KEY = localStorage.getItem('openrouter_api_key') || '';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ==============================
// FUNÇÃO PARA CONFIGURAR API KEY
// ==============================
function configureOpenRouter() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <h3 style="margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-robot"></i> Configurar OpenRouter API
            </h3>
            
            <div class="form-group">
                <label class="form-label">API Key OpenRouter</label>
                <input type="password" id="apiKeyInput" class="form-control" 
                       value="${OPENROUTER_API_KEY}"
                       placeholder="Cole sua API key aqui">
                <small style="color: var(--secondary); margin-top: 4px; display: block;">
                    Obtenha sua API key gratuita em <a href="https://openrouter.ai/keys" target="_blank" style="color: var(--primary);">openrouter.ai/keys</a>
                </small>
            </div>
            
            <div class="form-group" style="margin-top: 20px;">
                <label class="form-label">Modelo de IA</label>
                <select id="modelSelect" class="form-control">
                    <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (Free)</option>
                    <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="openai/gpt-4">GPT-4</option>
                    <option value="google/gemini-pro">Gemini Pro</option>
                    <option value="anthropic/claude-2">Claude 2</option>
                </select>
            </div>
            
            <div class="form-group" style="margin-top: 20px;">
                <label class="form-label">
                    Temperatura: <span id="tempValue">0.7</span>
                </label>
                <input type="range" id="tempRange" class="form-control" min="0" max="1" step="0.1" value="0.7">
            </div>
            
            <div style="margin-top: 32px; display: flex; gap: 12px; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="closeModal()">
                    Cancelar
                </button>
                <button class="btn btn-primary" onclick="saveApiConfig()">
                    <i class="fas fa-save"></i> Salvar Configurações
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Configurar slider
    const tempRange = document.getElementById('tempRange');
    const tempValue = document.getElementById('tempValue');
    if (tempRange && tempValue) {
        tempRange.addEventListener('input', (e) => {
            tempValue.textContent = e.target.value;
        });
    }
    
    // Carregar configurações salvas
    const savedModel = localStorage.getItem('ai_model');
    const savedTemp = localStorage.getItem('ai_temperature');
    if (savedModel) {
        document.getElementById('modelSelect').value = savedModel;
    }
    if (savedTemp) {
        tempRange.value = savedTemp;
        tempValue.textContent = savedTemp;
    }
}

function saveApiConfig() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    const model = document.getElementById('modelSelect').value;
    const temperature = document.getElementById('tempRange').value;
    
    if (!apiKey) {
        showNotification('Digite uma API key válida', 'error');
        return;
    }
    
    // Salvar configurações
    localStorage.setItem('openrouter_api_key', apiKey);
    localStorage.setItem('ai_model', model);
    localStorage.setItem('ai_temperature', temperature);
    
    // Atualizar variável global
    OPENROUTER_API_KEY = apiKey;
    
    closeModal();
    showNotification('Configurações da IA salvas com sucesso!', 'success');
    
    // Atualizar status
    updateApiStatus();
}

function updateApiStatus() {
    const apiStatus = document.querySelector('.api-status');
    if (apiStatus) {
        const hasApiKey = !!localStorage.getItem('openrouter_api_key');
        apiStatus.innerHTML = `
            <i class="fas fa-plug" style="color: ${hasApiKey ? 'var(--success)' : 'var(--danger)'}"></i>
            <span>OpenRouter: ${hasApiKey ? 'CONECTADA' : 'DESCONECTADA'}</span>
        `;
    }
}

// ==============================
// CHAT COM IA ONLINE/API
// ==============================
async function generateAIResponseOnline(userMessage) {
    const course = localCourses.find(c => c.id === currentCourse.id);
    
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Assistance SM'
            },
            body: JSON.stringify({
                model: localStorage.getItem('ai_model') || 'mistralai/mistral-7b-instruct:free',
                messages: [
                    {
                        role: 'system',
                        content: `Você é um assistente de vendas especializado em cursos universitários brasileiros.
                        
INFORMAÇÕES SOBRE O CURSO:
- Nome: ${course.name}
- Duração: ${course.duration}
- Descrição: ${course.description}
- Preço: R$ ${course.price.toFixed(2)} mensais
- Modalidades: Presencial, Semipresencial e EaD

INSTRUÇÕES IMPORTANTES:
1. Responda sempre em português brasileiro
2. Seja profissional e amigável
3. Use formatação markdown para organizar as respostas
4. Inclua emojis relevantes para tornar a resposta mais visual
5. Foque em ajudar com vendas e esclarecimento de dúvidas
6. Se a pergunta for sobre script de vendas, forneça um script completo e pronto para uso
7. Se for sobre valores, forneça todas as opções de pagamento
8. Se for sobre mercado de trabalho, seja realista e otimista

EXEMPLOS DE RESPOSTAS:
- Para dúvidas sobre o curso: forneça detalhes da grade, professores, infraestrutura
- Para valores: mostre todas as formas de pagamento e descontos disponíveis
- Para scripts: forneça modelos prontos para WhatsApp, ligação ou e-mail`
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                temperature: parseFloat(localStorage.getItem('ai_temperature') || '0.7'),
                max_tokens: 1500
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Erro na API: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('Erro na API OpenRouter:', error);
        throw error;
    }
}

// ==============================
// FUNÇÃO SENDMESSAGE ATUALIZADA
// ==============================
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
        let aiResponse;
        
        // Verificar se API está configurada
        const hasApiKey = !!localStorage.getItem('openrouter_api_key');
        
        if (hasApiKey) {
            // Usar IA online
            try {
                aiResponse = await generateAIResponseOnline(message);
                showNotification('Resposta da IA online carregada!', 'success');
            } catch (apiError) {
                console.warn('Falha na API, usando resposta local:', apiError);
                // Fallback para resposta local
                aiResponse = await generateLocalResponse(message);
                showNotification('Usando resposta local (API offline)', 'warning');
            }
        } else {
            // Usar IA local
            aiResponse = await generateLocalResponse(message);
            showNotification('Usando IA local - Configure a API para respostas avançadas', 'info');
        }
        
        // Adicionar resposta com botões de ação
        addMessage('assistant', aiResponse, true);
        
        // Salvar no histórico
        await saveChatHistoryLocal(message, aiResponse);
        
    } catch (error) {
        console.error('Erro ao gerar resposta:', error);
        addMessage('assistant', 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.');
    } finally {
        // Restaurar botão
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        
        // Remover indicador de digitação
        hideTypingIndicator();
    }
}

// ==============================
// GESTÃO DE CURSOS COM BOTÃO DE CONFIGURAÇÃO IA
// ==============================
async function loadCoursesManagement() {
    if (currentUser?.role !== 'admin') {
        showNotification('Acesso restrito a administradores', 'error');
        showPage('dashboard');
        return;
    }
    
    displayCoursesManagement(localCourses);
}

function displayCoursesManagement(courses) {
    const container = document.getElementById('coursesPage');
    if (!container) return;
    
    // Verificar status da API
    const hasApiKey = !!localStorage.getItem('openrouter_api_key');
    
    container.innerHTML = `
        <div class="admin-section">
            <h2 class="section-title">
                <i class="fas fa-book"></i> Gestão de Cursos
            </h2>
            
            <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
                <button class="btn btn-success" onclick="showAddCourseModal()">
                    <i class="fas fa-plus"></i> Adicionar Novo Curso
                </button>
                
                <button class="btn btn-info" onclick="configureOpenRouter()">
                    <i class="fas fa-robot"></i> Configurar IA
                </button>
                
                <div class="api-status" style="margin-left: auto; display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--light); border-radius: var(--radius);">
                    ${hasApiKey ? 
                        '<i class="fas fa-plug" style="color: var(--success)"></i><span>IA Online</span>' : 
                        '<i class="fas fa-plug" style="color: var(--danger)"></i><span>IA Local</span>'
                    }
                </div>
            </div>
            
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
                                <td>
                                    <span class="badge ${course.active ? 'badge-success' : 'badge-secondary'}">
                                        ${course.active ? 'Ativo' : 'Inativo'}
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
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 32px; padding: 20px; background: var(--light); border-radius: var(--radius);">
                <h4><i class="fas fa-robot"></i> Status da Inteligência Artificial</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px;">
                    <div>
                        <strong>Modo:</strong> ${hasApiKey ? 'Online (OpenRouter)' : 'Local'}
                    </div>
                    <div>
                        <strong>Modelo:</strong> ${localStorage.getItem('ai_model') || 'Mistral 7B (Local)'}
                    </div>
                    <div>
                        <strong>Respostas geradas:</strong> ${JSON.parse(localStorage.getItem('chat_history') || '[]').length}
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-primary" onclick="configureOpenRouter()">
                            <i class="fas fa-cog"></i> Alterar Configurações
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    updateApiStatus();
}

// ==============================
// PÁGINA DE CONFIGURAÇÕES COM OPÇÃO IA
// ==============================
function loadSettings() {
    if (!document.getElementById('settingsPage')) {
        // Criar página de configurações se não existir
        const mainContent = document.querySelector('.main-content .page-container');
        if (mainContent) {
            mainContent.innerHTML += `
                <div id="settingsPage" class="page">
                    <div class="admin-section">
                        <h2 class="section-title">
                            <i class="fas fa-cog"></i> Configurações
                        </h2>
                        
                        <div class="config-grid">
                            <div class="admin-card">
                                <h3><i class="fas fa-robot"></i> Inteligência Artificial</h3>
                                <p style="color: var(--secondary); margin: 12px 0;">Configure sua API do OpenRouter</p>
                                <button class="btn btn-primary" onclick="configureOpenRouter()">
                                    <i class="fas fa-sliders-h"></i> Configurar IA
                                </button>
                            </div>
                            
                            <div class="admin-card">
                                <h3><i class="fas fa-database"></i> Dados Locais</h3>
                                <p style="color: var(--secondary); margin: 12px 0;">Gerencie dados armazenados localmente</p>
                                <button class="btn btn-warning" onclick="clearLocalData()" style="margin-top: 8px;">
                                    <i class="fas fa-trash"></i> Limpar Cache
                                </button>
                            </div>
                            
                            <div class="admin-card">
                                <h3><i class="fas fa-download"></i> Exportar Dados</h3>
                                <p style="color: var(--secondary); margin: 12px 0;">Faça backup dos seus dados</p>
                                <button class="btn btn-success" onclick="exportData()" style="margin-top: 8px;">
                                    <i class="fas fa-file-export"></i> Exportar Tudo
                                </button>
                            </div>
                        </div>
                        
                        <div style="margin-top: 32px; padding: 24px; background: var(--light); border-radius: var(--radius);">
                            <h4><i class="fas fa-info-circle"></i> Informações do Sistema</h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-top: 16px;">
                                <div>
                                    <strong>Versão:</strong> 4.0.1
                                </div>
                                <div>
                                    <strong>Usuário:</strong> ${currentUser?.nome || 'Não logado'}
                                </div>
                                <div>
                                    <strong>Status IA:</strong> ${localStorage.getItem('openrouter_api_key') ? 'Online' : 'Local'}
                                </div>
                                <div>
                                    <strong>Cursos:</strong> ${localCourses.filter(c => c.active).length} ativos
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    showPage('settings');
}

function clearLocalData() {
    if (confirm('Tem certeza que deseja limpar todos os dados locais? Esta ação não pode ser desfeita.')) {
        // Limpar dados específicos, mantendo configurações de API
        const apiKey = localStorage.getItem('openrouter_api_key');
        const aiModel = localStorage.getItem('ai_model');
        const aiTemp = localStorage.getItem('ai_temperature');
        
        localStorage.clear();
        
        // Restaurar configurações de API
        if (apiKey) localStorage.setItem('openrouter_api_key', apiKey);
        if (aiModel) localStorage.setItem('ai_model', aiModel);
        if (aiTemp) localStorage.setItem('ai_temperature', aiTemp);
        
        // Recarregar dados padrão
        loadLocalData();
        
        showNotification('Dados locais limpos com sucesso', 'success');
        setTimeout(() => location.reload(), 1500);
    }
}

function exportData() {
    const data = {
        cursos: localCourses,
        feedbacks: localFeedbacks,
        usuarios: localUsers,
        historico: JSON.parse(localStorage.getItem('chat_history') || '[]'),
        exportDate: new Date().toISOString(),
        sistema: 'Assistance SM v4.0.1'
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

// ==============================
// ADICIONAR ITEM NO MENU PARA CONFIGURAÇÕES
// ==============================
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
    
    // Adicionar item de configurações ao menu se não existir
    const navList = document.querySelector('.nav-list');
    const settingsItem = navList.querySelector('[data-page="settings"]');
    
    if (!settingsItem) {
        const settingsNav = document.createElement('li');
        settingsNav.className = 'nav-item';
        settingsNav.setAttribute('data-page', 'settings');
        settingsNav.innerHTML = `
            <i class="fas fa-cog"></i>
            <span>Configurações</span>
        `;
        navList.appendChild(settingsNav);
        
        settingsNav.addEventListener('click', () => {
            loadSettings();
        });
    }
}

// ==============================
// MODIFICAÇÃO NA FUNÇÃO SHOWPAGE
// ==============================
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
        case 'settings':
            loadSettings();
            break;
        case 'about':
            loadAbout();
            break;
    }
}

// ==============================
// INICIALIZAÇÃO COM VERIFICAÇÃO DE API
// ==============================
document.addEventListener('DOMContentLoaded', async () => {
    // Carregar dados do localStorage
    loadLocalData();
    
    // Inicializar banco de dados local
    await initDatabase();
    
    // Verificar se há usuário logado
    if (currentUser) {
        await showMainSystem();
        
        // Verificar se API está configurada
        const hasApiKey = !!localStorage.getItem('openrouter_api_key');
        if (!hasApiKey && currentUser.role === 'admin') {
            // Mostrar aviso para admin configurar API
            setTimeout(() => {
                showNotification('Configure a API OpenRouter para usar IA avançada!', 'info', 5000);
            }, 2000);
        }
    }
    
    // Configurar eventos globais
    setupGlobalEvents();
});

// ==============================
// EXPORTAR FUNÇÕES ADICIONAIS
// ==============================
window.configureOpenRouter = configureOpenRouter;
window.saveApiConfig = saveApiConfig;
window.loadSettings = loadSettings;
window.clearLocalData = clearLocalData;
window.exportData = exportData;
