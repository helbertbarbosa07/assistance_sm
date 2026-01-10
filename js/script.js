 // ==============================
        // VARIÁVEIS GLOBAIS
        // ==============================
        let db = null;
        let currentUser = null;
        let currentCourse = null;
        let isTyping = false;

        // ==============================
        // INICIALIZAÇÃO DO BANCO DE DADOS
        // ==============================
        async function initDatabase() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('AssistanceSistemaDB', 8);
                
                request.onupgradeneeded = function(event) {
                    db = event.target.result;
                    
                    // Criar object stores se não existirem
                    if (!db.objectStoreNames.contains('users')) {
                        const usersStore = db.createObjectStore('users', { keyPath: 'username' });
                        usersStore.createIndex('role', 'role', { unique: false });
                    }
                    
                    if (!db.objectStoreNames.contains('courses')) {
                        const coursesStore = db.createObjectStore('courses', { keyPath: 'id' });
                        coursesStore.createIndex('name', 'name', { unique: false });
                    }
                    
                    if (!db.objectStoreNames.contains('feedbacks')) {
                        const feedbacksStore = db.createObjectStore('feedbacks', { keyPath: 'id', autoIncrement: true });
                        feedbacksStore.createIndex('userId', 'userId', { unique: false });
                        feedbacksStore.createIndex('date', 'date', { unique: false });
                    }
                    
                    if (!db.objectStoreNames.contains('chats')) {
                        const chatsStore = db.createObjectStore('chats', { keyPath: 'id', autoIncrement: true });
                        chatsStore.createIndex('userId', 'userId', { unique: false });
                        chatsStore.createIndex('date', 'date', { unique: false });
                    }
                };
                
                request.onsuccess = function(event) {
                    db = event.target.result;
                    console.log('Banco de dados inicializado com sucesso');
                    resolve(db);
                };
                
                request.onerror = function(event) {
                    console.error('Erro ao abrir banco de dados:', event.target.error);
                    reject(event.target.error);
                };
            });
        }

        // ==============================
        // FUNÇÕES DE AUTENTICAÇÃO
        // ==============================
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
                await initDatabase();
                
                // Verificar se usuário existe
                const user = await getUser(username);
                
                if (!user) {
                    // Criar novo usuário
                    const newUser = {
                        username: username,
                        nome: username,
                        role: 'user',
                        status: 'active',
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString()
                    };
                    
                    await saveUser(newUser);
                    currentUser = newUser;
                } else {
                    // Atualizar último login
                    user.lastLogin = new Date().toISOString();
                    await saveUser(user);
                    currentUser = user;
                }
                
                // Salvar sessão
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Carregar dados iniciais
                await loadInitialData();
                
                // Mostrar sistema
                showMainSystem();
                
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
            
            // Verificar credenciais padrão
            const validAdmins = [
                { user: 'admin', pass: 'admin123' },
                { user: 'suporte', pass: 'suporte123' }
            ];
            
            const isValid = validAdmins.some(admin => 
                admin.user === username && admin.pass === password
            );
            
            if (isValid) {
                try {
                    await initDatabase();
                    
                    // Verificar se admin existe
                    let user = await getUser(username);
                    
                    if (!user) {
                        // Criar admin
                        user = {
                            username: username,
                            nome: 'Administrador',
                            role: 'admin',
                            status: 'active',
                            createdAt: new Date().toISOString(),
                            lastLogin: new Date().toISOString(),
                            isAdmin: true
                        };
                        
                        await saveUser(user);
                    }
                    
                    // Atualizar último login
                    user.lastLogin = new Date().toISOString();
                    await saveUser(user);
                    currentUser = user;
                    
                    // Salvar sessão
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    
                    // Carregar dados iniciais
                    await loadInitialData();
                    
                    // Mostrar sistema
                    showMainSystem();
                    
                    showNotification(`Bem-vindo, Admin ${username}!`, 'success');
                    
                } catch (error) {
                    console.error('Erro no login admin:', error);
                    showNotification('Erro ao fazer login', 'error');
                }
            } else {
                showNotification('Credenciais inválidas!', 'error');
            }
        }

        function logout() {
            localStorage.removeItem('currentUser');
            currentUser = null;
            
            document.getElementById('app').style.display = 'none';
            document.getElementById('loginPage').style.display = 'flex';
            
            // Resetar campos de login
            document.getElementById('username').value = 'Usuário Teste';
            document.getElementById('adminUser').value = 'admin';
            document.getElementById('adminPass').value = 'admin123';
        }

        // ==============================
        // FUNÇÕES DO BANCO DE DADOS
        // ==============================
        async function getUser(username) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['users'], 'readonly');
                const store = transaction.objectStore('users');
                const request = store.get(username);
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        async function saveUser(user) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['users'], 'readwrite');
                const store = transaction.objectStore('users');
                const request = store.put(user);
                
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
        }

        async function getAllUsers() {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['users'], 'readonly');
                const store = transaction.objectStore('users');
                const request = store.getAll();
                
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        }

        async function getAllCourses() {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['courses'], 'readonly');
                const store = transaction.objectStore('courses');
                const request = store.getAll();
                
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        }

        async function saveCourse(course) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['courses'], 'readwrite');
                const store = transaction.objectStore('courses');
                const request = store.put(course);
                
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
        }

        async function deleteCourse(courseId) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['courses'], 'readwrite');
                const store = transaction.objectStore('courses');
                const request = store.delete(courseId);
                
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
        }

        // ==============================
        // FUNÇÕES DO SISTEMA PRINCIPAL
        // ==============================
        function showMainSystem() {
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('app').style.display = 'flex';
            
            // Atualizar informações do usuário
            updateUserInfo();
            
            // Configurar navegação
            setupNavigation();
            
            // Carregar dashboard inicial
            loadDashboard();
        }

        function updateUserInfo() {
            if (currentUser) {
                document.getElementById('userName').textContent = currentUser.nome || currentUser.username;
                document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'Administrador' : 'Usuário';
                document.getElementById('userFullName').textContent = currentUser.nome || currentUser.username;
                document.getElementById('userAvatar').textContent = (currentUser.nome || currentUser.username).charAt(0).toUpperCase();
                
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
                    
                    // Mostrar página correspondente
                    const page = this.getAttribute('data-page');
                    showPage(page);
                });
            });
        }

        function showPage(page) {
            // Ocultar todas as páginas
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            
            // Mostrar página selecionada
            document.getElementById(page + 'Page').classList.add('active');
            
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
                const [users, courses, feedbacks] = await Promise.all([
                    getAllUsers(),
                    getAllCourses(),
                    // Função para buscar feedbacks
                    Promise.resolve([]) // Placeholder
                ]);
                
                updateDashboardStats(users, courses, feedbacks);
                
            } catch (error) {
                console.error('Erro ao carregar dashboard:', error);
            }
        }

        function updateDashboardStats(users, courses, feedbacks) {
            const statsContainer = document.getElementById('dashboardStats');
            
            const stats = [
                {
                    title: 'Total de Usuários',
                    value: users.length,
                    icon: 'fas fa-users',
                    color: 'var(--primary)'
                },
                {
                    title: 'Cursos Cadastrados',
                    value: courses.length,
                    icon: 'fas fa-book',
                    color: 'var(--success)'
                },
                {
                    title: 'Feedbacks Recebidos',
                    value: feedbacks.length,
                    icon: 'fas fa-comment',
                    color: 'var(--warning)'
                },
                {
                    title: 'Usuários Ativos',
                    value: users.filter(u => u.status === 'active').length,
                    icon: 'fas fa-user-check',
                    color: 'var(--info)'
                }
            ];
            
            statsContainer.innerHTML = stats.map(stat => `
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
        // CHAT IA
        // ==============================
        async function loadChat() {
            try {
                const courses = await getAllCourses();
                displayCourses(courses);
                
                // Adicionar event listener para input
                document.getElementById('userInput').addEventListener('keypress', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                    }
                });
                
                // Configurar auto-expand do textarea
                this.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = (this.scrollHeight) + 'px';
                });
                
            } catch (error) {
                console.error('Erro ao carregar chat:', error);
            }
        }

        function displayCourses(courses) {
            const container = document.getElementById('cursosContainer');
            
            if (courses.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--secondary);">
                        <i class="fas fa-book" style="font-size: 48px; margin-bottom: 16px;"></i>
                        <p>Nenhum curso cadastrado</p>
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
                    </div>
                </div>
            `).join('');
        }

        function selectCourse(courseId) {
            // Remover seleção anterior
            document.querySelectorAll('.curso-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Adicionar seleção atual
            const selectedItem = document.querySelector(`[data-course-id="${courseId}"]`);
            if (selectedItem) {
                selectedItem.classList.add('active');
            }
            
            // Atualizar curso atual
            currentCourse = courseId;
            
            // Atualizar header
            const courseName = selectedItem ? selectedItem.querySelector('h3').textContent : 'Curso Selecionado';
            document.getElementById('currentCourse').innerHTML = `
                <i class="fas fa-book"></i>
                <span>${courseName}</span>
            `;
            
            // Limpar chat
            clearChat();
            
            // Adicionar mensagem inicial
            addMessage('assistant', `
                Olá! Sou seu assistente especializado em <strong>${courseName}</strong>.
                
                **Como posso ajudar você hoje?**
                
                • Fornecer informações sobre o curso
                • Responder dúvidas sobre mercado de trabalho
                • Explicar sobre especializações
                • Falar sobre preços e modalidades
                
                O que gostaria de saber sobre este curso?
            `);
            
            // Atualizar ações rápidas
            updateQuickActions(courseName);
        }

        function updateQuickActions(courseName) {
            const quickActions = document.getElementById('quickActions');
            
            const actions = [
                { text: `Informações sobre ${courseName}`, prompt: `Me dê informações completas sobre o curso de ${courseName}` },
                { text: 'Mercado de trabalho', prompt: `Quais são as oportunidades de mercado para ${courseName}?` },
                { text: 'Duração e modalidades', prompt: `Quais são as durações e modalidades disponíveis para ${courseName}?` },
                { text: 'Preços e descontos', prompt: `Quais são os preços e opções de desconto para ${courseName}?` }
            ];
            
            quickActions.innerHTML = actions.map(action => `
                <button class="quick-action" onclick="setPrompt('${action.prompt}')">
                    ${action.text}
                </button>
            `).join('');
        }

        function setPrompt(prompt) {
            document.getElementById('userInput').value = prompt;
            document.getElementById('userInput').focus();
        }

        function clearChat() {
            const container = document.getElementById('messagesContainer');
            container.innerHTML = '';
            
            // Adicionar mensagem inicial do assistente
            addMessage('assistant', 'Olá! Como posso ajudar você hoje?');
        }

        function addMessage(sender, content) {
            const container = document.getElementById('messagesContainer');
            const messageDiv = document.createElement('div');
            
            messageDiv.className = `message ${sender}`;
            messageDiv.innerHTML = `
                <div class="message-header">
                    <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
                    ${sender === 'user' ? 'Você' : 'Assistente IA'}
                </div>
                <div class="message-content">${content}</div>
            `;
            
            container.appendChild(messageDiv);
            container.scrollTop = container.scrollHeight;
        }

        async function sendMessage() {
            const input = document.getElementById('userInput');
            const message = input.value.trim();
            
            if (!message) return;
            
            if (!currentCourse) {
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
            
            // Desabilitar botão de enviar
            const sendButton = document.getElementById('sendButton');
            sendButton.disabled = true;
            
            try {
                // Simular resposta da IA (substituir por API real)
                await simulateAIResponse(message);
                
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
                addMessage('assistant', 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.');
            } finally {
                // Remover indicador de digitação
                hideTypingIndicator();
                sendButton.disabled = false;
            }
        }

        function showTypingIndicator() {
            const container = document.getElementById('messagesContainer');
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

        async function simulateAIResponse(userMessage) {
            // Simular delay da IA
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Respostas simuladas baseadas no tipo de pergunta
            let response = '';
            
            if (userMessage.toLowerCase().includes('informação') || userMessage.toLowerCase().includes('sobre')) {
                response = `
                    **Informações sobre o curso:**
                    
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
                    ✓ Parcerias com empresas
                    ✓ Programa de estágio garantido
                    ✓ Visitas técnicas regulares
                    ✓ Certificações intermediárias
                `;
            } else if (userMessage.toLowerCase().includes('preço') || userMessage.toLowerCase().includes('valor')) {
                response = `
                    **Informações de Investimento:**
                    
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
                    - Indicação: 20% para ambos
                    
                    **Condições especiais para:**
                    ✓ Servidores públicos
                    ✓ Funcionários de empresas parceiras
                    ✓ Ex-alunos
                `;
            } else if (userMessage.toLowerCase().includes('mercado') || userMessage.toLowerCase().includes('trabalho')) {
                response = `
                    **Mercado de Trabalho:**
                    
                    **Salário Médio:**
                    • Júnior: R$ 3.500 - R$ 5.000
                    • Pleno: R$ 5.000 - R$ 8.000
                    • Sênior: R$ 8.000 - R$ 15.000
                    
                    **Áreas em alta:**
                    - Farmácia Hospitalar
                    - Farmácia Clínica
                    - Indústria Farmacêutica
                    - Cosmetologia
                    - Fitoterapia
                    
                    **Taxa de empregabilidade:** 92%
                    **Tempo médio para emprego:** 3 meses após formado
                    
                    **Empresas parceiras que contratam:**
                    • Rede de Hospitais Albert Einstein
                    • Pfizer
                    • Eurofarma
                    • Drogaria São Paulo
                    • Rede D'Or
                `;
            } else {
                response = `
                    Entendi sua pergunta sobre "${userMessage}". 
                    
                    Como assistente especializado, posso fornecer informações detalhadas sobre:
                    
                    1. **Grade curricular completa**
                    2. **Corpo docente e qualificações**
                    3. **Infraestrutura do curso**
                    4. **Processo seletivo**
                    5. **Estágios obrigatórios**
                    6. **Programa de intercâmbio**
                    7. **Especializações disponíveis**
                    
                    Você tem interesse em algum desses tópicos específicos?
                `;
            }
            
            addMessage('assistant', response);
        }

        // ==============================
        // FUNÇÕES UTILITÁRIAS
        // ==============================
        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        async function loadInitialData() {
            try {
                // Criar cursos de exemplo se não existirem
                const courses = await getAllCourses();
                if (courses.length === 0) {
                    await createSampleCourses();
                }
            } catch (error) {
                console.error('Erro ao carregar dados iniciais:', error);
            }
        }

        async function createSampleCourses() {
            const sampleCourses = [
                {
                    id: '1',
                    name: 'Farmácia',
                    duration: '5 anos (bacharelado)',
                    icon: 'fas fa-pills',
                    description: 'Curso completo de Farmácia com ênfase em pesquisa e prática hospitalar.',
                    modalities: ['presencial', 'ead'],
                    prices: {
                        presencial: 1200,
                        ead: 650
                    }
                },
                {
                    id: '2',
                    name: 'Enfermagem',
                    duration: '5 anos (bacharelado)',
                    icon: 'fas fa-user-md',
                    description: 'Formação em Enfermagem com foco em cuidado humanizado e técnicas avançadas.',
                    modalities: ['presencial', 'semipresencial'],
                    prices: {
                        presencial: 1100,
                        semipresencial: 750
                    }
                },
                {
                    id: '3',
                    name: 'Medicina',
                    duration: '6 anos (bacharelado)',
                    icon: 'fas fa-stethoscope',
                    description: 'Curso de Medicina com base científica sólida e ampla prática clínica.',
                    modalities: ['presencial'],
                    prices: {
                        presencial: 4500
                    }
                }
            ];
            
            for (const course of sampleCourses) {
                await saveCourse(course);
            }
        }

        // ==============================
        // INICIALIZAÇÃO DO SISTEMA
        // ==============================
        document.addEventListener('DOMContentLoaded', async function() {
            // Verificar se há usuário logado
            const savedUser = localStorage.getItem('currentUser');
            
            if (savedUser) {
                try {
                    currentUser = JSON.parse(savedUser);
                    await initDatabase();
                    await loadInitialData();
                    showMainSystem();
                } catch (error) {
                    console.error('Erro ao restaurar sessão:', error);
                    localStorage.removeItem('currentUser');
                }
            }
        });

        // ==============================
        // FUNÇÕES DE GESTÃO DE CURSOS (Admin)
        // ==============================
        async function loadCoursesManagement() {
            if (currentUser.role !== 'admin') {
                showNotification('Acesso restrito a administradores', 'error');
                showPage('dashboard');
                return;
            }
            
            try {
                const courses = await getAllCourses();
                displayCoursesManagement(courses);
            } catch (error) {
                console.error('Erro ao carregar gestão de cursos:', error);
            }
        }

        function displayCoursesManagement(courses) {
            const container = document.getElementById('coursesPage');
            
            container.innerHTML = `
                <div class="admin-section">
                    <h2 class="section-title">
                        <i class="fas fa-book"></i> Gestão de Cursos
                    </h2>
                    
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                        <div>
                            <label class="form-label">Nome do Curso</label>
                            <input type="text" id="newCourseName" class="form-control" placeholder="Ex: Farmácia">
                        </div>
                        <div>
                            <label class="form-label">Duração</label>
                            <input type="text" id="newCourseDuration" class="form-control" placeholder="Ex: 5 anos">
                        </div>
                        <div>
                            <label class="form-label">Ícone</label>
                            <input type="text" id="newCourseIcon" class="form-control" placeholder="fas fa-book">
                        </div>
                        <div>
                            <label class="form-label">Descrição</label>
                            <textarea id="newCourseDescription" class="form-control" rows="3" placeholder="Descrição do curso"></textarea>
                        </div>
                    </div>
                    
                    <button class="btn btn-success" onclick="addNewCourse()">
                        <i class="fas fa-plus"></i> Adicionar Curso
                    </button>
                </div>
                
                <div class="admin-section">
                    <h3 class="section-title">
                        <i class="fas fa-list"></i> Cursos Cadastrados
                    </h3>
                    
                    <div id="coursesList">
                        ${courses.length === 0 ? 
                            '<p style="text-align: center; color: var(--secondary);">Nenhum curso cadastrado</p>' : 
                            courses.map(course => `
                                <div class="course-item" style="padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <h4 style="margin-bottom: 5px;">
                                            <i class="${course.icon || 'fas fa-book'}"></i> 
                                            ${course.name}
                                        </h4>
                                        <p style="color: var(--secondary); font-size: 14px;">
                                            ${course.duration || 'Sem duração definida'}
                                        </p>
                                    </div>
                                    <div>
                                        <button class="btn btn-sm btn-danger" onclick="deleteCoursePrompt('${course.id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            `;
        }

        async function addNewCourse() {
            const name = document.getElementById('newCourseName').value.trim();
            const duration = document.getElementById('newCourseDuration').value.trim();
            const icon = document.getElementById('newCourseIcon').value.trim();
            const description = document.getElementById('newCourseDescription').value.trim();
            
            if (!name) {
                showNotification('Digite o nome do curso', 'error');
                return;
            }
            
            try {
                const newCourse = {
                    id: Date.now().toString(),
                    name: name,
                    duration: duration,
                    icon: icon || 'fas fa-book',
                    description: description,
                    createdAt: new Date().toISOString()
                };
                
                await saveCourse(newCourse);
                
                // Limpar formulário
                document.getElementById('newCourseName').value = '';
                document.getElementById('newCourseDuration').value = '';
                document.getElementById('newCourseIcon').value = '';
                document.getElementById('newCourseDescription').value = '';
                
                // Recarregar lista
                await loadCoursesManagement();
                
                showNotification('Curso adicionado com sucesso!', 'success');
                
            } catch (error) {
                console.error('Erro ao adicionar curso:', error);
                showNotification('Erro ao adicionar curso', 'error');
            }
        }

        async function deleteCoursePrompt(courseId) {
            if (confirm('Tem certeza que deseja excluir este curso?')) {
                try {
                    await deleteCourse(courseId);
                    await loadCoursesManagement();
                    showNotification('Curso excluído com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao excluir curso:', error);
                    showNotification('Erro ao excluir curso', 'error');
                }
            }
        }

        // ==============================
        // PAINEL ADMINISTRATIVO
        // ==============================
        async function loadAdminPanel() {
            if (currentUser.role !== 'admin') {
                showNotification('Acesso restrito a administradores', 'error');
                showPage('dashboard');
                return;
            }
            
            try {
                const users = await getAllUsers();
                const courses = await getAllCourses();
                
                displayAdminPanel(users, courses);
                
            } catch (error) {
                console.error('Erro ao carregar painel admin:', error);
            }
        }

        function displayAdminPanel(users, courses) {
            const container = document.getElementById('adminPage');
            
            container.innerHTML = `
                <div class="admin-section">
                    <h2 class="section-title">
                        <i class="fas fa-cogs"></i> Painel Administrativo
                    </h2>
                    
                    <div class="admin-stats">
                        <div class="stat-card">
                            <div class="stat-icon" style="background: var(--primary);">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${users.length}</h3>
                                <p>Total de Usuários</p>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon" style="background: var(--success);">
                                <i class="fas fa-book"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${courses.length}</h3>
                                <p>Cursos Cadastrados</p>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon" style="background: var(--warning);">
                                <i class="fas fa-user-shield"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${users.filter(u => u.role === 'admin').length}</h3>
                                <p>Administradores</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="admin-section">
                    <h3 class="section-title">
                        <i class="fas fa-users"></i> Gerenciar Usuários
                    </h3>
                    
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: var(--light);">
                                    <th style="padding: 12px; text-align: left;">Usuário</th>
                                    <th style="padding: 12px; text-align: left;">Função</th>
                                    <th style="padding: 12px; text-align: left;">Status</th>
                                    <th style="padding: 12px; text-align: left;">Último Login</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(user => `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 12px;">
                                            <strong>${user.username}</strong><br>
                                            <small>${user.nome || ''}</small>
                                        </td>
                                        <td style="padding: 12px;">
                                            <span class="badge ${user.role === 'admin' ? 'badge-danger' : 'badge-success'}">
                                                ${user.role === 'admin' ? 'Admin' : 'Usuário'}
                                            </span>
                                        </td>
                                        <td style="padding: 12px;">
                                            <span class="badge ${user.status === 'active' ? 'badge-success' : 'badge-warning'}">
                                                ${user.status === 'active' ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td style="padding: 12px;">
                                            ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Nunca'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // ==============================
        // SOBRE
        // ==============================
        function loadAbout() {
            const container = document.getElementById('aboutPage');
            
            container.innerHTML = `
                <div class="admin-section">
                    <h2 class="section-title">
                        <i class="fas fa-info-circle"></i> Sobre o Sistema
                    </h2>
                    
                    <p><strong>Assistance SM</strong> é um sistema inteligente desenvolvido para gestão educacional com integração de Inteligência Artificial.</p>
                    
                    <h3 style="margin-top: 20px; color: var(--primary);">Funcionalidades Principais:</h3>
                    <ul style="margin-left: 20px; margin-top: 10px;">
                        <li><strong>Dashboard Intuitivo:</strong> Visualização de estatísticas e métricas do sistema</li>
                        <li><strong>Assistente IA:</strong> Chatbot inteligente para suporte e vendas de cursos</li>
                        <li><strong>Sistema de Feedback:</strong> Avaliação e coleta de opiniões dos usuários</li>
                        <li><strong>Gestão de Cursos:</strong> CRUD completo de cursos e especializações</li>
                        <li><strong>Administração:</strong> Controle de usuários e configurações do sistema</li>
                    </ul>
                    
                    <div style="margin-top: 30px; padding: 20px; background: var(--light); border-radius: var(--radius);">
                        <h3 style="color: var(--primary);">Versão:</h3>
                        <p>Sistema IA v3.0 - Integração Completa</p>
                        <p><strong>Desenvolvido por:</strong> Equipe Assistance SM</p>
                    </div>
                </div>
            `;
        }

        // ==============================
        // FEEDBACKS
        // ==============================
        async function loadFeedbacks() {
            // Implementar sistema de feedbacks
            const container = document.getElementById('feedbackPage');
            
            container.innerHTML = `
                <div class="admin-section">
                    <h2 class="section-title">
                        <i class="fas fa-comment-dots"></i> Sistema de Feedback
                    </h2>
                    
                    <p>Em desenvolvimento...</p>
                    <p>Esta funcionalidade permitirá que usuários enviem avaliações e sugestões para melhorias no sistema.</p>
                </div>
            `;
        }
