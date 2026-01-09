
 <script>
    // ==============================
    // INTEGRAÇÃO COM SUAS PÁGINAS - CORRIGIDA
    // ==============================
    
    // Esta função verifica se o usuário está logado
    function checkAuth() {
      // Verifica se há um usuário logado na sua aplicação
      // Primeiro tenta o formato novo (objeto JSON)
      const loggedUserStr = localStorage.getItem('assistance_logged_user');
      
      if (loggedUserStr) {
        try {
          // Tenta parsear como JSON
          const userData = JSON.parse(loggedUserStr);
          
          // Se for um objeto JSON válido com propriedades de usuário
          if (userData && typeof userData === 'object') {
            // Mapeia os campos corretamente - CORREÇÃO ESPECÍFICA PARA SEU CASO
            const nome = userData.name || userData.nome || 'Administrador';
            
            // Remove qualquer JSON que possa estar no nome
            const cleanNome = nome.replace(/\{.*?\}/g, '').trim();
            
            return {
              username: userData.username || userData.id || 'admin',
              nome: cleanNome || 'Administrador',
              role: userData.isAdmin ? 'admin' : (userData.role || 'admin')
            };
          }
        } catch(e) {
          console.log('Não é JSON válido:', e);
          // Se não for JSON válido, extrai nome do texto se possível
          if (loggedUserStr.includes('"name":')) {
            try {
              const match = loggedUserStr.match(/"name":"([^"]+)"/);
              if (match && match[1]) {
                return {
                  username: 'admin',
                  nome: match[1],
                  role: 'admin'
                };
              }
            } catch(err) {
              console.log('Erro ao extrair nome:', err);
            }
          }
        }
      }
      
      // Compatibilidade com versões antigas
      const legacyUser = localStorage.getItem('currentUser');
      const legacyRole = localStorage.getItem('userRole');
      if (legacyUser) {
        const cleanUser = legacyUser.replace(/\{.*?\}/g, '').trim();
        return { 
          username: cleanUser || 'user', 
          nome: cleanUser || 'Usuário', 
          role: legacyRole || 'user' 
        };
      }
      
      // Se nada for encontrado, retorna null
      return null;
    }
    
    // ==============================
    // BANCO DE DADOS SQLite (IndexedDB)
    // ==============================
    
    let db;
    let currentUser = null;
    let currentChatCourse = null;
    let currentCourseId = null;
    let isSavingCourse = false;

    // Inicializar banco de dados
    function initDatabase() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('AssistanceSistemaDB', 6); // Aumentado para versão 6
        
        request.onerror = (event) => {
          console.error('Erro ao abrir banco de dados:', event.target.error);
          reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
          db = event.target.result;
          console.log('Banco de dados inicializado com sucesso');
          resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Tabela de usuários
          if (!db.objectStoreNames.contains('users')) {
            const usersStore = db.createObjectStore('users', { keyPath: 'username' });
            usersStore.createIndex('nome', 'nome', { unique: false });
            usersStore.createIndex('role', 'role', { unique: false });
            usersStore.createIndex('status', 'status', { unique: false });
          }
          
          // Tabela de cursos
          if (!db.objectStoreNames.contains('courses')) {
            const coursesStore = db.createObjectStore('courses', { keyPath: 'id' });
            coursesStore.createIndex('name', 'name', { unique: true });
          }
          
          // Tabela de feedbacks
          if (!db.objectStoreNames.contains('feedbacks')) {
            const feedbacksStore = db.createObjectStore('feedbacks', { keyPath: 'id', autoIncrement: true });
            feedbacksStore.createIndex('userId', 'userId', { unique: false });
            feedbacksStore.createIndex('rating', 'rating', { unique: false });
            feedbacksStore.createIndex('date', 'date', { unique: false });
          }
          
          // Tabela de conversas IA
          if (!db.objectStoreNames.contains('chats')) {
            const chatsStore = db.createObjectStore('chats', { keyPath: 'id', autoIncrement: true });
            chatsStore.createIndex('userId', 'userId', { unique: false });
            chatsStore.createIndex('courseId', 'courseId', { unique: false });
            chatsStore.createIndex('date', 'date', { unique: false });
          }
        };
      });
    }

    // ==============================
    // FUNÇÕES DO BANCO DE DADOS
    // ==============================

    // Usuários
    async function getUser(username) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const request = store.get(username);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async function getAllUsers() {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    // Cursos
    async function addCourse(course) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['courses'], 'readwrite');
        const store = transaction.objectStore('courses');
        const request = store.add(course);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async function getCourse(id) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['courses'], 'readonly');
        const store = transaction.objectStore('courses');
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async function getAllCourses() {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['courses'], 'readonly');
        const store = transaction.objectStore('courses');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async function updateCourse(id, updates) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['courses'], 'readwrite');
        const store = transaction.objectStore('courses');
        const request = store.get(id);
        
        request.onsuccess = () => {
          const course = request.result;
          if (course) {
            Object.assign(course, updates);
            const updateRequest = store.put(course);
            updateRequest.onsuccess = () => resolve(course);
            updateRequest.onerror = () => reject(updateRequest.error);
          } else {
            reject(new Error('Curso não encontrado'));
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    }

    async function deleteCourse(id) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['courses'], 'readwrite');
        const store = transaction.objectStore('courses');
        const request = store.delete(id);
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    }

    // Feedbacks
    async function addFeedback(feedback) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['feedbacks'], 'readwrite');
        const store = transaction.objectStore('feedbacks');
        const request = store.add(feedback);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async function getAllFeedbacks() {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['feedbacks'], 'readonly');
        const store = transaction.objectStore('feedbacks');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    // ==============================
    // FUNÇÕES DE AUTENTICAÇÃO
    // ==============================

    function logout() {
      localStorage.removeItem('assistance_logged_user');
      sessionStorage.clear();
      window.location.href = 'login.html';
    }

    function updateUserInterface() {
      if (!currentUser) return;
      
      // VALIDAÇÃO ADICIONAL: Garante que não mostre JSON como texto
      const userNameToShow = typeof currentUser.nome === 'string' ? 
        currentUser.nome.replace(/\{.*?\}/g, '').trim() : 
        (currentUser.username || 'Usuário');
      
      // Garante que não seja um objeto JSON ou string com JSON
      const isValidName = typeof userNameToShow === 'string' && 
                         userNameToShow.length > 0 && 
                         !userNameToShow.startsWith('{') &&
                         !userNameToShow.includes('"id":');
      
      if (!isValidName) {
        console.warn('Nome de usuário inválido detectado, usando padrão:', userNameToShow);
        document.getElementById('userName').textContent = 'Administrador';
        document.getElementById('userFullName').textContent = 'Administrador';
      } else {
        document.getElementById('userName').textContent = userNameToShow;
        document.getElementById('userFullName').textContent = userNameToShow;
      }
      
      document.getElementById('userRole').textContent = 
        currentUser.role === 'admin' ? 'Administrador' : 'Usuário';
      
      // Inicial das letras do nome para avatar
      const userName = isValidName ? userNameToShow : 'A';
      const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
      document.getElementById('userAvatar').textContent = initials.substring(0, 2);
      
      // Mensagem personalizada na top bar
      const hour = new Date().getHours();
      let greeting = '';
      if (hour < 12) greeting = 'Bom dia';
      else if (hour < 18) greeting = 'Boa tarde';
      else greeting = 'Boa noite';
      
      // Garante que a mensagem de boas-vindas não contenha JSON
      const safeGreetingName = isValidName ? userNameToShow : 'Administrador';
      document.getElementById('welcomeMessage').innerHTML = 
        `${greeting}, <strong>${safeGreetingName}</strong>!`;
        
      // Mostrar/ocultar itens de menu (AGORA TODOS VÊEM GESTÃO DE CURSOS)
      document.getElementById('coursesNavItem').style.display = 'flex';
    }

    // ==============================
    // CONTROLE DE ACESSO MODIFICADO
    // ==============================
    
    function checkAccess(pageId) {
      // REMOVIDA A RESTRIÇÃO DE ACESSO PARA CURSOS
      // Agora todas as páginas são acessíveis a todos os usuários
      return true;
    }

    // ==============================
    // FUNÇÕES DE NAVEGAÇÃO
    // ==============================
    
    function setupNavigation() {
      const navItems = document.querySelectorAll('.nav-item');
      const pages = document.querySelectorAll('.page');
      
      navItems.forEach(item => {
        item.addEventListener('click', function() {
          const pageId = this.getAttribute('data-page');
          
          // Verificar acesso (agora sempre retorna true)
          if (!checkAccess(pageId)) {
            return;
          }
          
          loadPage(pageId, this);
        });
      });
    }
    
    function loadPage(pageId, navElement) {
      const pages = document.querySelectorAll('.page');
      const navItems = document.querySelectorAll('.nav-item');
      
      navItems.forEach(nav => nav.classList.remove('active'));
      navElement.classList.add('active');
      
      pages.forEach(page => page.classList.remove('active'));
      document.getElementById(`${pageId}Page`).classList.add('active');
      
      if (pageId === 'ia') initChatPage();
      if (pageId === 'feedback') initFeedbackPage();
      if (pageId === 'courses') initCoursesPage();
      if (pageId === 'lgpd') updateLGPDPage();
    }

    // ==============================
    // DASHBOARD
    // ==============================
    
    async function updateDashboardStats() {
      try {
        const courses = await getAllCourses();
        const feedbacks = await getAllFeedbacks();
        const users = await getAllUsers();
        
        document.getElementById('dashboardStats').innerHTML = `
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-user-circle"></i>
            </div>
            <div class="stat-info">
              <h3>${currentUser.username || 'admin'}</h3>
              <p>Seu Usuário</p>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-book"></i>
            </div>
            <div class="stat-info">
              <h3>${courses.length}</h3>
              <p>Cursos Disponíveis</p>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-comments"></i>
            </div>
            <div class="stat-info">
              <h3>${feedbacks.length}</h3>
              <p>Feedbacks</p>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-info">
              <h3>${users.length}</h3>
              <p>Total de Usuários</p>
            </div>
          </div>
        `;
        
        document.getElementById('totalCursosCount').textContent = courses.length;
        document.getElementById('totalFeedbacksCount').textContent = feedbacks.length;
        
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      }
    }

    // ==============================
    // CHAT IA - COM BUSCA ESPECÍFICA POR CURSO
    // ==============================
    
    async function initChatPage() {
      try {
        const courses = await getAllCourses();
        renderCoursesSidebar(courses);
        setupQuickActions();
        
        const userInput = document.getElementById('userInput');
        if (userInput) {
          userInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
          });
        }
        
      } catch (error) {
        console.error('Erro ao inicializar chat:', error);
      }
    }

    function renderCoursesSidebar(courses) {
      const container = document.getElementById('cursosContainer');
      container.innerHTML = '';
      
      courses.forEach(course => {
        const courseElement = document.createElement('div');
        courseElement.className = `curso-item ${currentCourseId === course.id ? 'active' : ''}`;
        
        // Adicionar badges de modalidades
        let modalityBadges = '';
        if (course.modalities && course.modalities.length > 0) {
          course.modalities.forEach(mod => {
            let badgeClass = '';
            let icon = '';
            switch(mod) {
              case 'presencial': 
                badgeClass = 'badge-presencial'; 
                icon = 'fas fa-university';
                break;
              case 'semipresencial': 
                badgeClass = 'badge-semipresencial'; 
                icon = 'fas fa-laptop-house';
                break;
              case 'aovivo': 
                badgeClass = 'badge-aovivo'; 
                icon = 'fas fa-video';
                break;
              case 'ead': 
                badgeClass = 'badge-ead'; 
                icon = 'fas fa-globe';
                break;
            }
            modalityBadges += `<span class="modality-badge ${badgeClass}"><i class="${icon}"></i> ${mod}</span> `;
          });
        }
        
        courseElement.innerHTML = `
          <div class="curso-icon">
            <i class="${course.icon || 'fas fa-book'}"></i>
          </div>
          <div class="curso-info">
            <h3>${course.name}</h3>
            <p>${course.duration}</p>
            <div style="margin-top: 4px;">${modalityBadges}</div>
          </div>
        `;
        
        courseElement.addEventListener('click', () => selectCourse(course));
        container.appendChild(courseElement);
      });
    }

    function selectCourse(course) {
      currentCourseId = course.id;
      currentChatCourse = course;
      
      document.getElementById('currentCourse').innerHTML = `
        <i class="${course.icon || 'fas fa-book'}"></i>
        <span>${course.name} - ${course.duration}</span>
      `;
      
      document.querySelectorAll('.curso-item').forEach(item => {
        item.classList.remove('active');
      });
      event.target.closest('.curso-item').classList.add('active');
      
      // Mostrar informações do curso selecionado
      let modalityText = '';
      if (course.modalities && course.modalities.length > 0) {
        const modalityNames = course.modalities.map(mod => {
          switch(mod) {
            case 'presencial': return 'Presencial';
            case 'semipresencial': return 'Semipresencial';
            case 'aovivo': return 'Ao Vivo Online';
            case 'ead': return 'EaD';
            default: return mod;
          }
        });
        modalityText = `\n\n📚 **Modalidades disponíveis:** ${modalityNames.join(', ')}`;
      }
      
      // Mostrar preços se disponíveis
      let priceText = '';
      if (course.prices) {
        const priceList = [];
        if (course.prices.presencial) priceList.push(`**Presencial:** R$ ${course.prices.presencial}`);
        if (course.prices.semipresencial) priceList.push(`**Semipresencial:** R$ ${course.prices.semipresencial}`);
        if (course.prices.aovivo) priceList.push(`**Ao Vivo Online:** R$ ${course.prices.aovivo}`);
        if (course.prices.ead) priceList.push(`**EaD:** R$ ${course.prices.ead}`);
        
        if (priceList.length > 0) {
          priceText = `\n\n💰 **Valores:**\n${priceList.join('\n')}`;
        }
      }
      
      addMessage('assistant', `✅ **Curso selecionado: ${course.name}**\n\n📅 **Duração:** ${course.duration}${modalityText}${priceText}\n\nAgora posso ajudá-lo com informações específicas deste curso! Como posso ajudar com as vendas?`);
    }

    function setupQuickActions() {
      const actions = [
        { text: '📞 Criar script para ligação', prompt: 'Crie um script de vendas para ligação telefônica usando as informações específicas do curso' },
        { text: '💬 Script para WhatsApp', prompt: 'Elabore um script de vendas para WhatsApp baseado nos diferenciais do curso' },
        { text: '🛡️ Responder objeções', prompt: 'Liste as principais objeções para este curso específico e como respondê-las' },
        { text: '🎯 Técnicas de fechamento', prompt: 'Sugira técnicas de fechamento específicas para este curso' },
        { text: '📊 Argumentos de vendas', prompt: 'Quais são os principais argumentos de venda específicos para este curso?' },
        { text: '💰 Falar sobre investimento', prompt: 'Como abordar o assunto do valor deste curso específico?' },
        { text: '🎓 Diferenciais do curso', prompt: 'Quais são os principais diferenciais deste curso que devo destacar?' },
        { text: '💼 Mercado de trabalho', prompt: 'Como falar sobre as oportunidades de mercado para este curso específico?' }
      ];
      
      const quickActions = document.getElementById('quickActions');
      quickActions.innerHTML = '';
      
      actions.forEach(action => {
        const button = document.createElement('button');
        button.className = 'quick-action';
        button.textContent = action.text;
        button.addEventListener('click', () => {
          if (currentCourseId) {
            document.getElementById('userInput').value = action.prompt;
            document.getElementById('userInput').focus();
          } else {
            showNotification('Por favor, selecione um curso primeiro!', 'warning');
          }
        });
        quickActions.appendChild(button);
      });
    }

    function addMessage(role, content, isThinking = false) {
      const messagesContainer = document.getElementById('messagesContainer');
      
      if (isThinking) {
        const typingElement = document.createElement('div');
        typingElement.className = 'typing-indicator';
        typingElement.innerHTML = `
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        `;
        messagesContainer.appendChild(typingElement);
        return typingElement;
      } else {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;
        messageElement.innerHTML = `
          <div class="message-header">
            <i class="fas fa-${role === 'user' ? 'user' : 'robot'}"></i>
            ${role === 'user' ? 'Você' : 'Assistente IA'}
          </div>
          <div class="message-content">${formatMessage(content)}</div>
        `;
        messagesContainer.appendChild(messageElement);
        return messageElement;
      }
      
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }

    function formatMessage(text) {
      function escapeHtml(str) {
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      const escaped = escapeHtml(text);
      return escaped
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    }

    async function sendMessage() {
      const userInput = document.getElementById('userInput');
      const message = userInput.value.trim();
      
      if (!message) return;
      
      if (!currentCourseId) {
        showNotification('Por favor, selecione um curso primeiro!', 'warning');
        return;
      }
      
      addMessage('user', message);
      userInput.value = '';
      userInput.style.height = 'auto';
      
      const typingEl = addMessage('assistant', '', true);
      const sendBtn = document.getElementById('sendButton');
      if (sendBtn) sendBtn.disabled = true;

      try {
        const apiKey = localStorage.getItem('openrouterApiKey');
        let responseText;
        if (apiKey) {
          responseText = await generateOnlineResponse(message, typingEl);
        } else {
          responseText = await generateLocalResponse(message);
          typingEl?.remove();
          addMessage('assistant', responseText);
        }
        
        if (currentUser) {
          await addChat({
            userId: currentUser.username,
            courseId: currentCourseId,
            userMessage: message,
            aiResponse: responseText,
            date: new Date().toISOString()
          });
        }
        
      } catch (error) {
        console.error('Erro no chat:', error);
        document.querySelector('.typing-indicator')?.remove();
        addMessage('assistant', `Desculpe, ocorreu um erro: ${error && error.message ? error.message : error}. Tente novamente.`);
      } finally {
        if (sendBtn) sendBtn.disabled = false;
      }
    }

    async function addChat(chatData) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['chats'], 'readwrite');
        const store = transaction.objectStore('chats');
        const request = store.add(chatData);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    // ==============================
    // IA COM INFORMAÇÕES ESPECÍFICAS DO CURSO
    // ==============================

    async function generateLocalResponse(userMessage) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const course = currentChatCourse;
      const lowerMessage = userMessage.toLowerCase();
      
      // Construir informações do curso para a IA
      const courseInfo = `
        CURSO: ${course.name}
        DURAÇÃO: ${course.duration}
        DESCRIÇÃO: ${course.description}
        DIFERENCIAIS: ${course.differentials?.join(', ') || 'Não especificado'}
        MERCADO DE TRABALHO: ${course.market?.join(', ') || 'Não especificado'}
        ESPECIALIZAÇÕES: ${course.postgrad?.join(', ') || 'Não especificado'}
        EVENTOS: ${course.events?.join(', ') || 'Não especificado'}
        ESTÁGIOS: ${course.internships || 'Não especificado'}
        MODALIDADES: ${course.modalities?.join(', ') || 'Presencial'}
        PREÇOS: ${JSON.stringify(course.prices || {})}
      `;
      
      // Respostas específicas baseadas nas informações do curso
      if (lowerMessage.includes('script') || lowerMessage.includes('ligação')) {
        return `📞 **SCRIPT PARA LIGAÇÃO - ${course.name}**

**Saudação:**
"Olá, [Nome], tudo bem? Aqui é [Seu nome] da Assistance SM."

**Apresentação:**
"Estou entrando em contato sobre nosso curso de ${course.name} (${course.duration})."

**Diferenciais Específicos:**
${course.differentials?.map((d, i) => `${i + 1}. ${d}`).join('\n') || '• Corpo docente qualificado\n• Infraestrutura moderna'}

**Mercado:**
${course.market?.[0] || 'Amplas oportunidades no mercado atual'}

**Modalidades:**
${course.modalities?.map(mod => {
  switch(mod) {
    case 'presencial': return '• Presencial';
    case 'semipresencial': return '• Semipresencial';
    case 'aovivo': return '• Ao Vivo Online';
    case 'ead': return '• EaD';
    default: return `• ${mod}`;
  }
}).join('\n') || '• Presencial'}

**Call to Action:**
"Gostaria de agendar uma visita para conhecer nossa estrutura ou tem interesse em alguma modalidade específica?"`;
      }
      
      if (lowerMessage.includes('whatsapp')) {
        return `💬 **SCRIPT PARA WHATSAPP - ${course.name}**

*Mensagem inicial:*
Olá [Nome]! Tudo bem? 😊

Sou [Seu nome] da Assistance SM e gostaria de falar sobre nosso curso de *${course.name}*.

*Duração:* ${course.duration}

*Principais diferenciais:*
${course.differentials?.slice(0, 3).map(d => `✅ ${d}`).join('\n') || '✅ Corpo docente qualificado\n✅ Infraestrutura completa\n✅ Mercado em expansão'}

*Modalidades disponíveis:*
${course.modalities?.map(mod => {
  switch(mod) {
    case 'presencial': return '🏫 Presencial';
    case 'semipresencial': return '💻 Semipresencial';
    case 'aovivo': return '🎥 Ao Vivo Online';
    case 'ead': return '🌐 EaD';
    default: return `📚 ${mod}`;
  }
}).join('\n') || '🏫 Presencial'}

*Encerramento:*
Tem interesse em saber mais detalhes ou agendar uma visita? 😄`;
      }
      
      if (lowerMessage.includes('objeç') || lowerMessage.includes('responder')) {
        return `🛡️ **PRINCIPAIS OBJEÇÕES - ${course.name}**

1. *"É muito caro!"*
   - Resposta: "Entendo sua preocupação. Vamos analisar o investimento x retorno: ${course.market?.[0] || 'Os profissionais da área têm remuneração competitiva.'} Além disso, oferecemos ${course.modalities?.length > 1 ? 'diferentes modalidades com valores variados' : 'opções de pagamento flexíveis'}."

2. *"Não tenho tempo para estudar."*
   - Resposta: "Oferecemos ${course.modalities?.map(mod => {
     switch(mod) {
       case 'semipresencial': return 'modalidade semipresencial';
       case 'aovivo': return 'aulas ao vivo online';
       case 'ead': return 'EaD completo';
       default: return 'flexibilidade';
     }
   }).join(' e ') || 'flexibilidade de horários'}. Você pode adaptar aos seus horários."

3. *"O mercado está saturado."*
   - Resposta: "Pelo contrário! ${course.market?.[0] || 'O mercado para esta área está em expansão.'} ${course.differentials?.[0] || 'Nossos alunos têm altos índices de empregabilidade.'}"

4. *"Não sei se é para mim."*
   - Resposta: "Temos ${course.events?.[0] ? course.events[0] + ' onde você pode conhecer' : 'eventos onde você pode conhecer'} a estrutura e conversar com nossos professores. Que tal agendar uma visita?"`;
      }
      
      if (lowerMessage.includes('diferencial') || lowerMessage.includes('vantagem')) {
        return `🏆 **DIFERENCIAIS - ${course.name}**

${course.differentials?.map((d, i) => `${i + 1}. **${d}**`).join('\n\n') || '1. **Corpo docente qualificado com experiência de mercado**\n2. **Infraestrutura moderna e laboratórios equipados**\n3. **Parcerias com empresas para estágios**'}

💡 *Como usar na venda:*
• Personalize os diferenciais de acordo com o perfil do cliente
• Destaque os que são únicos deste curso
• Relacione com as necessidades específicas do mercado`;
      }
      
      if (lowerMessage.includes('mercado') || lowerMessage.includes('trabalho')) {
        return `💼 **MERCADO DE TRABALHO - ${course.name}**

${course.market?.map(m => `📊 ${m}`).join('\n\n') || '📊 **Profissional Júnior:** R$ 3.500 - R$ 5.000\n📊 **Profissional Pleno:** R$ 6.000 - R$ 10.000\n📊 **Profissional Sênior:** R$ 9.000 - R$ 15.000'}

${course.postgrad?.length > 0 ? `\n🎓 **Especializações possíveis:**\n${course.postgrad.map(p => `• ${p}`).join('\n')}` : ''}

${course.internships ? `\n👨‍💼 **Oportunidades de estágio:**\n${course.internships}` : ''}`;
      }
      
      if (lowerMessage.includes('preço') || lowerMessage.includes('valor') || lowerMessage.includes('investimento')) {
        let priceInfo = '';
        if (course.prices) {
          const priceLines = [];
          if (course.prices.presencial) priceLines.push(`**Presencial:** R$ ${course.prices.presencial}`);
          if (course.prices.semipresencial) priceLines.push(`**Semipresencial:** R$ ${course.prices.semipresencial}`);
          if (course.prices.aovivo) priceLines.push(`**Ao Vivo Online:** R$ ${course.prices.aovivo}`);
          if (course.prices.ead) priceLines.push(`**EaD:** R$ ${course.prices.ead}`);
          
          priceInfo = `💰 **VALORES POR MODALIDADE:**\n\n${priceLines.join('\n\n')}\n\n`;
        }
        
        return `${priceInfo}💡 **COMO ABORDAR O INVESTIMENTO:**

1. *Contextualize o valor:*
   "Considerando que ${course.duration}, o investimento mensal fica em torno de R$ X. O retorno vem logo nos primeiros meses de atuação."

2. *Compare com o mercado:*
   "${course.market?.[0] ? 'Um ' + course.market[0].split(':')[0] + ' ganha em média' : 'Os profissionais da área têm remuneração média de'} R$ Y, o que mostra um excelente retorno sobre o investimento."

3. *Destaque o diferencial:*
   "Nosso curso oferece ${course.differentials?.[0] || 'diferenciais únicos'} que fazem toda a diferença na formação."

4. *Ofereça opções:*
   "Temos ${course.modalities?.length || 1} modalidade${course.modalities?.length !== 1 ? 's' : ''} disponível${course.modalities?.length !== 1 ? 's' : ''} com valores diferentes para atender sua realidade."`;
      }
      
      // Resposta padrão com informações do curso
      return `🤖 **INFORMAÇÕES ESPECÍFICAS - ${course.name}**

*Duração:* ${course.duration}

*Descrição:*
${course.description || 'Curso de qualidade com foco no mercado atual.'}

*Diferenciais Principais:*
${course.differentials?.slice(0, 3).map(d => `• ${d}`).join('\n') || '• Corpo docente qualificado\n• Infraestrutura moderna\n• Foco no mercado de trabalho'}

*Modalidades:*
${course.modalities?.map(mod => {
  switch(mod) {
    case 'presencial': return '• 🏫 Presencial';
    case 'semipresencial': return '• 💻 Semipresencial';
    case 'aovivo': return '• 🎥 Ao Vivo Online';
    case 'ead': return '• 🌐 EaD';
    default: return `• 📚 ${mod}`;
  }
}).join('\n') || '• 🏫 Presencial'}

Como posso ajudar mais especificamente com este curso?`;
    }

    // ==============================
    // RESPOSTA ONLINE VIA OPENROUTER COM INFORMAÇÕES DO CURSO
    // ==============================

    function getApiConfig() {
      const key = localStorage.getItem('openrouterApiKey');
      const model = localStorage.getItem('aiModel') || 'mistralai/mistral-7b-instruct:free';
      const system = localStorage.getItem('systemInstructions') || 'Você é um assistente de vendas especializado em cursos da Assistance SM. Use as informações específicas do curso para criar respostas personalizadas. Responda em português brasileiro.';
      const temperature = parseFloat(localStorage.getItem('aiTemperature') || '0.7');
      const maxTokens = parseInt(localStorage.getItem('maxTokens') || '800', 10);
      return { key, model, system, temperature, maxTokens };
    }

    async function generateOnlineResponse(userMessage, typingElement) {
      const cfg = getApiConfig();
      if (!cfg.key) throw new Error('API key não configurada');

      // Preparar informações específicas do curso para a IA
      const course = currentChatCourse;
      const courseContext = `
        CONTEXTO DO CURSO PARA VENDAS:
        NOME: ${course.name}
        DURAÇÃO: ${course.duration}
        DESCRIÇÃO: ${course.description || 'Não especificado'}
        DIFERENCIAIS: ${course.differentials?.join('; ') || 'Não especificado'}
        MERCADO DE TRABALHO: ${course.market?.join('; ') || 'Não especificado'}
        ESPECIALIZAÇÕES: ${course.postgrad?.join('; ') || 'Não especificado'}
        EVENTOS: ${course.events?.join('; ') || 'Não especificado'}
        ESTÁGIOS: ${course.internships || 'Não especificado'}
        MODALIDADES DISPONÍVEIS: ${course.modalities?.map(mod => {
          switch(mod) {
            case 'presencial': return 'Presencial';
            case 'semipresencial': return 'Semipresencial';
            case 'aovivo': return 'Ao Vivo Online';
            case 'ead': return 'EaD';
            default: return mod;
          }
        }).join(', ') || 'Presencial'}
        PREÇOS: ${course.prices ? JSON.stringify(course.prices) : 'Não especificado'}
        
        INSTRUÇÃO: Use estas informações específicas para criar respostas personalizadas para vendas. Seja persuasivo, profissional e focado nas necessidades do cliente.
      `;

      const messages = [
        { role: 'system', content: cfg.system + '\n\n' + courseContext },
        { role: 'user', content: userMessage }
      ];

      typingElement?.remove();
      const assistantEl = addMessage('assistant', '');
      const contentEl = assistantEl.querySelector('.message-content');

      const endpoints = [
        'https://api.openrouter.ai/v1/chat/completions',
        'https://openrouter.ai/v1/chat/completions',
        'https://openrouter.ai/api/v1/chat/completions'
      ];

      let finalText = '';

      for (const url of endpoints) {
        try {
          const controller = new AbortController();
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream',
              'Authorization': `Bearer ${cfg.key}`
            },
            body: JSON.stringify({ 
              model: cfg.model, 
              messages, 
              temperature: cfg.temperature, 
              max_tokens: cfg.maxTokens, 
              stream: true 
            }),
            signal: controller.signal
          });

          if (!res.ok) {
            console.warn('OpenRouter endpoint retornou não-ok', url, res.status, await res.text().catch(()=>''));
            continue;
          }

          if (!res.body) {
            console.warn('Resposta sem body (não streaming) em', url);
            continue;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let done = false;
          let buffer = '';

          while (!done) {
            const { value, done: d } = await reader.read();
            done = d;
            if (!value) continue;

            buffer += decoder.decode(value, { stream: true });

            let parts = buffer.split('\n\n');
            buffer = parts.pop();

            for (const part of parts) {
              const lines = part.split('\n').map(l => l.trim());
              for (const line of lines) {
                if (!line) continue;
                if (!line.startsWith('data:')) continue;

                const payload = line.replace(/^data:\s?/, '');
                if (payload === '[DONE]') {
                  done = true;
                  break;
                }

                try {
                  const json = JSON.parse(payload);
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) {
                    finalText += delta;
                    contentEl.innerHTML = formatMessage(finalText);
                    const messagesContainer = document.getElementById('messagesContainer');
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                  }
                  if (json.choices?.[0]?.message?.content) {
                    finalText = json.choices[0].message.content;
                    contentEl.innerHTML = formatMessage(finalText);
                    const messagesContainer = document.getElementById('messagesContainer');
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                  }
                } catch (err) {
                  console.debug('Não foi possível parsear payload SSE:', err);
                }
              }
              if (done) break;
            }
            if (done) break;
          }

          if (finalText.trim()) return finalText.trim();
          if (contentEl.textContent && contentEl.textContent.trim()) return contentEl.textContent.trim();
          continue;

        } catch (err) {
          console.warn('Stream endpoint falhou:', url, err);
          continue;
        }
      }

      try {
        const fallbackUrl = 'https://api.openrouter.ai/v1/chat/completions';
        const r = await fetch(fallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cfg.key}`
          },
          body: JSON.stringify({ 
            model: cfg.model, 
            messages, 
            temperature: cfg.temperature, 
            max_tokens: cfg.maxTokens 
          })
        });

        if (!r.ok) throw new Error('Resposta da API não OK');
        const data = await r.json();
        const result = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
        contentEl.innerHTML = formatMessage(result);
        return result;
      } catch (err) {
        console.warn('Fallback não-streaming falhou:', err);
        addMessage('assistant', '(Atenção) Falha ao conectar à API — usando resposta local com informações do curso.');
        const local = await generateLocalResponse(userMessage);
        contentEl.innerHTML = formatMessage(local);
        return local;
      }
    }

    function handleKeyPress(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    }

    // ==============================
    // SISTEMA DE FEEDBACK MELHORADO
    // ==============================
    
    let selectedRating = 0;
    let ratingTexts = {
      1: "Péssimo",
      2: "Ruim", 
      3: "Regular",
      4: "Bom",
      5: "Excelente"
    };

    async function initFeedbackPage() {
      setupRatingStars();
      loadFeedbackStats();
      loadFeedbacks();
    }

    function setupRatingStars() {
      const stars = document.querySelectorAll('.star');
      const ratingText = document.getElementById('ratingText');
      
      stars.forEach(star => {
        star.addEventListener('mouseover', () => {
          const rating = parseInt(star.getAttribute('data-rating'));
          ratingText.textContent = ratingTexts[rating];
          
          stars.forEach(s => {
            const sRating = parseInt(s.getAttribute('data-rating'));
            s.textContent = sRating <= rating ? '★' : '☆';
          });
        });
        
        star.addEventListener('mouseout', () => {
          stars.forEach(s => {
            const sRating = parseInt(s.getAttribute('data-rating'));
            s.textContent = sRating <= selectedRating ? '★' : '☆';
          });
          ratingText.textContent = selectedRating > 0 ? ratingTexts[selectedRating] : "Clique nas estrelas para avaliar";
        });
        
        star.addEventListener('click', () => {
          selectedRating = parseInt(star.getAttribute('data-rating'));
          
          stars.forEach(s => {
            const sRating = parseInt(s.getAttribute('data-rating'));
            s.classList.toggle('active', sRating <= selectedRating);
            s.textContent = sRating <= selectedRating ? '★' : '☆';
          });
          
          ratingText.textContent = ratingTexts[selectedRating];
          ratingText.style.color = '#ffc107';
          ratingText.style.fontWeight = '600';
        });
      });
    }

    async function loadFeedbackStats() {
      try {
        const feedbacks = await getAllFeedbacks();
        const container = document.getElementById('feedbackStats');
        
        if (feedbacks.length === 0) {
          container.innerHTML = `
            <div class="stat-item">
              <div class="stat-value">0</div>
              <div class="stat-label">Avaliações</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">0.0</div>
              <div class="stat-label">Média</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">0</div>
              <div class="stat-label">Hoje</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">0%</div>
              <div class="stat-label">Positivas</div>
            </div>
          `;
          return;
        }
        
        const total = feedbacks.length;
        const avgRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / total;
        const today = new Date().toISOString().split('T')[0];
        const todayCount = feedbacks.filter(f => f.date.split('T')[0] === today).length;
        const positiveCount = feedbacks.filter(f => f.rating >= 4).length;
        const positivePercentage = Math.round((positiveCount / total) * 100);
        
        container.innerHTML = `
          <div class="stat-item">
            <div class="stat-value">${total}</div>
            <div class="stat-label">Avaliações</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${avgRating.toFixed(1)}</div>
            <div class="stat-label">Média</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${todayCount}</div>
            <div class="stat-label">Hoje</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${positivePercentage}%</div>
            <div class="stat-label">Positivas</div>
          </div>
        `;
        
      } catch (error) {
        console.error('Erro ao carregar estatísticas de feedback:', error);
      }
    }

    async function submitFeedback() {
      if (selectedRating === 0) {
        showNotification('Por favor, selecione uma avaliação com as estrelas.', 'danger');
        return;
      }
      
      const text = document.getElementById('feedbackText').value.trim();
      if (!text) {
        showNotification('Por favor, digite seu comentário.', 'danger');
        return;
      }
      
      try {
        await addFeedback({
          userId: currentUser.username,
          userName: currentUser.nome,
          rating: selectedRating,
          text: text,
          date: new Date().toISOString()
        });
        
        showNotification('Feedback enviado com sucesso! Obrigado por sua contribuição.', 'success', 3000);
        
        document.getElementById('feedbackText').value = '';
        selectedRating = 0;
        document.querySelectorAll('.star').forEach(star => {
          star.classList.remove('active');
          star.textContent = '☆';
        });
        
        document.getElementById('ratingText').textContent = 'Clique nas estrelas para avaliar';
        document.getElementById('ratingText').style.color = '';
        document.getElementById('ratingText').style.fontWeight = '';
        
        loadFeedbacks();
        loadFeedbackStats();
        
      } catch (error) {
        console.error('Erro ao enviar feedback:', error);
        showNotification('Erro ao enviar feedback. Tente novamente.', 'danger');
      }
    }

    async function loadFeedbacks() {
      try {
        const feedbacks = await getAllFeedbacks();
        const container = document.getElementById('feedbackList');
        const sortValue = document.getElementById('feedbackSort')?.value || 'newest';
        
        if (feedbacks.length === 0) {
          container.innerHTML = `
            <div class="empty-feedback">
              <i class="far fa-comment-dots"></i>
              <h3>Nenhum feedback ainda</h3>
              <p>Seja o primeiro a avaliar o sistema!</p>
            </div>
          `;
          return;
        }
        
        let sortedFeedbacks = [...feedbacks];
        switch(sortValue) {
          case 'newest':
            sortedFeedbacks.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
          case 'oldest':
            sortedFeedbacks.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
          case 'highest':
            sortedFeedbacks.sort((a, b) => b.rating - a.rating);
            break;
          case 'lowest':
            sortedFeedbacks.sort((a, b) => a.rating - b.rating);
            break;
        }
        
        container.innerHTML = sortedFeedbacks.map(feedback => {
          const date = new Date(feedback.date);
          const userName = feedback.userName || 'Usuário';
          // Limpa qualquer JSON que possa estar no nome
          const cleanUserName = userName.replace(/\{.*?\}/g, '').trim() || 'Usuário';
          const initials = cleanUserName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
          
          return `
            <div class="feedback-item">
              <div class="feedback-item-header">
                <div class="feedback-user-info">
                  <div class="feedback-user-avatar">${initials}</div>
                  <div class="feedback-user-details">
                    <h4>${cleanUserName}</h4>
                    <div class="feedback-rating-stars">
                      ${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}
                    </div>
                  </div>
                </div>
                <div class="feedback-date">
                  ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
              <div class="feedback-content">${feedback.text}</div>
            </div>
          `;
        }).join('');
        
      } catch (error) {
        console.error('Erro ao carregar feedbacks:', error);
        container.innerHTML = `
          <div class="empty-feedback">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Erro ao carregar feedbacks</h3>
            <p>Tente recarregar a página</p>
          </div>
        `;
      }
    }

    // ==============================
    // GESTÃO DE CURSOS - COM MODALIDADES E PREÇOS
    // ==============================
    
    async function initCoursesPage() {
      setupModalitySelection();
      loadCourses();
    }
function setupModalitySelection() {
  console.log("Configurando seleção de modalidades...");
  
  // Para cada opção de modalidade
  document.querySelectorAll('.modality-option').forEach(option => {
    // Quando clicar na opção
    option.addEventListener('click', function() {
      console.log("Clicou em:", this.getAttribute('data-modality'));
      
      // Acha o checkbox dentro
      const checkbox = this.querySelector('input[type="checkbox"]');
      
      // Muda o estado (se tava marcado, desmarca; se tava desmarcado, marca)
      checkbox.checked = !checkbox.checked;
      
      // Muda a cor (selecionado/desmarcado)
      if (checkbox.checked) {
        this.classList.add('selected');
      } else {
        this.classList.remove('selected');
      }
      
      // Mostra ou esconde o preço
      const modalidade = this.getAttribute('data-modality');
      const precoDiv = document.getElementById('price' + modalidade.charAt(0).toUpperCase() + modalidade.slice(1));
      if (precoDiv) {
        precoDiv.style.display = checkbox.checked ? 'block' : 'none';
      }
    });
  });
  
  console.log("Seleção de modalidades configurada!");
}
    async function loadCourses() {
      try {
        const courses = await getAllCourses();
        const container = document.getElementById('coursesList');
        
        if (courses.length === 0) {
          container.innerHTML = `
            <div class="no-courses">
              <i class="fas fa-book-open"></i>
              <h3>Nenhum curso cadastrado</h3>
              <p>Use o formulário acima para adicionar o primeiro curso.</p>
            </div>
          `;
          return;
        }
        
        container.innerHTML = `
          <table class="courses-table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Duração</th>
                <th>Modalidades</th>
                <th>Diferenciais</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${courses.map(course => {
                const differentials = course.differentials?.slice(0, 2).join(', ') || 'Sem diferenciais';
                
                // Badges de modalidades
                let modalityBadges = '';
                if (course.modalities && course.modalities.length > 0) {
                  course.modalities.forEach(mod => {
                    let badgeClass = '';
                    let icon = '';
                    switch(mod) {
                      case 'presencial': 
                        badgeClass = 'badge-presencial'; 
                        icon = 'fas fa-university';
                        break;
                      case 'semipresencial': 
                        badgeClass = 'badge-semipresencial'; 
                        icon = 'fas fa-laptop-house';
                        break;
                      case 'aovivo': 
                        badgeClass = 'badge-aovivo'; 
                        icon = 'fas fa-video';
                        break;
                      case 'ead': 
                        badgeClass = 'badge-ead'; 
                        icon = 'fas fa-globe';
                        break;
                    }
                    modalityBadges += `<span class="modality-badge ${badgeClass}"><i class="${icon}"></i> ${mod}</span> `;
                  });
                }
                
                // CORREÇÃO: Usar JSON.stringify para passar o ID corretamente
                const courseId = JSON.stringify(course.id).replace(/"/g, "'");
                
                return `
                  <tr>
                    <td>
                      <div class="course-name-cell">
                        <div class="course-icon-small">
                          <i class="${course.icon || 'fas fa-book'}"></i>
                        </div>
                        <div class="course-details">
                          <div class="course-name">${course.name}</div>
                          <div class="course-meta">
                            <i class="far fa-calendar"></i> Criado em ${new Date(course.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><span class="badge badge-warning">${course.duration}</span></td>
                    <td>${modalityBadges || 'Não especificado'}</td>
                    <td>${differentials}</td>
                    <td>
                      <div class="course-actions">
                        <button class="btn btn-sm btn-primary" onclick="editCourse(${courseId})">
                          <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCoursePrompt(${courseId})">
                          <i class="fas fa-trash"></i> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
        
      } catch (error) {
        console.error('Erro ao carregar cursos:', error);
        container.innerHTML = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle"></i>
            Erro ao carregar cursos. Tente recarregar a página.
          </div>
        `;
      }
    }

    async function editCourse(courseId) {
      try {
        console.log('Editando curso ID:', courseId, 'Tipo:', typeof courseId);
        
        // Limpa aspas extras se houver
        if (typeof courseId === 'string') {
          courseId = courseId.replace(/['"]/g, '');
        }
        
        // Se courseId for undefined, busca do elemento
        if (!courseId || courseId === 'undefined' || courseId === 'null') {
          console.error('ID do curso inválido:', courseId);
          showNotification('Erro: ID do curso não especificado.', 'danger');
          return;
        }
        
        const course = await getCourse(courseId);
        
        if (!course) {
          showNotification('Curso não encontrado.', 'danger');
          return;
        }
        
        console.log('Curso encontrado:', course);
        
        // Preencher formulário
        document.getElementById('courseId').value = course.id;
        document.getElementById('courseName').value = course.name;
        document.getElementById('courseDuration').value = course.duration;
        document.getElementById('courseIcon').value = course.icon;
        document.getElementById('courseDescription').value = course.description;
        document.getElementById('courseDifferentials').value = course.differentials?.join('\n') || '';
        document.getElementById('courseMarket').value = course.market?.join('\n') || '';
        document.getElementById('coursePostgrad').value = course.postgrad?.join('\n') || '';
        document.getElementById('courseEvents').value = course.events?.join('\n') || '';
        document.getElementById('courseInternships').value = course.internships || '';
        
        // Preencher modalidades
        const modalityOptions = document.querySelectorAll('.modality-option');
        modalityOptions.forEach(option => {
          const modality = option.getAttribute('data-modality');
          const checkbox = option.querySelector('input[type="checkbox"]');
          const isSelected = course.modalities && course.modalities.includes(modality);
          checkbox.checked = isSelected;
          if (isSelected) {
            option.classList.add('selected');
            // Mostrar campo de preço correspondente
            const priceContainer = document.getElementById(`price${modality.charAt(0).toUpperCase() + modality.slice(1)}`);
            if (priceContainer) {
              priceContainer.style.display = 'block';
            }
          } else {
            option.classList.remove('selected');
          }
        });
        
        // Preencher preços
        if (course.prices) {
          if (course.prices.presencial) {
            document.getElementById('pricePresencialValue').value = course.prices.presencial;
          }
          if (course.prices.semipresencial) {
            document.getElementById('priceSemipresencialValue').value = course.prices.semipresencial;
          }
          if (course.prices.aovivo) {
            document.getElementById('priceAovivoValue').value = course.prices.aovivo;
          }
          if (course.prices.ead) {
            document.getElementById('priceEadValue').value = course.prices.ead;
          }
        }
        
        // Atualizar título e botões
        document.getElementById('courseFormTitle').textContent = 'Editar Curso';
        document.getElementById('saveCourseBtn').innerHTML = '<i class="fas fa-save"></i> Atualizar Curso';
        document.getElementById('cancelCourseBtn').style.display = 'inline-flex';
        
        // Scroll para o formulário
        document.getElementById('courseFormContainer').scrollIntoView({ behavior: 'smooth' });
        
      } catch (error) {
        console.error('Erro ao carregar curso:', error);
        showNotification('Erro ao carregar curso para edição: ' + error.message, 'danger');
      }
    }

    // ==============================
    // FUNÇÃO PRINCIPAL PARA SALVAR CURSO (COM MODALIDADES E PREÇOS)
    // ==============================

    async function saveCourse() {
      // Verificar se já está salvando
      if (isSavingCourse) {
        return;
      }

      const id = document.getElementById('courseId').value;
      const name = document.getElementById('courseName').value.trim();
      const duration = document.getElementById('courseDuration').value.trim();
      const icon = document.getElementById('courseIcon').value.trim();
      const description = document.getElementById('courseDescription').value.trim();
      
      if (!name || !duration || !description) {
        showNotification('Por favor, preencha os campos obrigatórios (Nome, Duração, Descrição).', 'danger');
        return;
      }

      // Verificar se o nome já existe (exceto para o próprio curso sendo editado)
      if (!id) { // Apenas para novos cursos
        const courses = await getAllCourses();
        const existingCourse = courses.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (existingCourse) {
          showNotification(`Já existe um curso com o nome "${name}". Por favor, escolha um nome diferente.`, 'danger');
          return;
        }
      }

      // Coletar modalidades selecionadas
      const selectedModalities = [];
      const modalityCheckboxes = document.querySelectorAll('input[name="modality"]:checked');
      modalityCheckboxes.forEach(checkbox => {
        selectedModalities.push(checkbox.value);
      });
      
      if (selectedModalities.length === 0) {
        showNotification('Por favor, selecione pelo menos uma modalidade.', 'danger');
        return;
      }

      // Coletar preços por modalidade
      const prices = {};
      if (selectedModalities.includes('presencial')) {
        const price = document.getElementById('pricePresencialValue').value;
        if (price && !isNaN(parseFloat(price))) {
          prices.presencial = parseFloat(price).toFixed(2);
        }
      }
      if (selectedModalities.includes('semipresencial')) {
        const price = document.getElementById('priceSemipresencialValue').value;
        if (price && !isNaN(parseFloat(price))) {
          prices.semipresencial = parseFloat(price).toFixed(2);
        }
      }
      if (selectedModalities.includes('aovivo')) {
        const price = document.getElementById('priceAovivoValue').value;
        if (price && !isNaN(parseFloat(price))) {
          prices.aovivo = parseFloat(price).toFixed(2);
        }
      }
      if (selectedModalities.includes('ead')) {
        const price = document.getElementById('priceEadValue').value;
        if (price && !isNaN(parseFloat(price))) {
          prices.ead = parseFloat(price).toFixed(2);
        }
      }

      // Mostrar diálogo de senha de administrador
      const isEditMode = !!id;
      const operation = isEditMode ? 'atualizar' : 'adicionar';
      
      const adminPassword = await showPasswordDialog(`Para ${operation} o curso "${name}", digite a senha de administrador:`);
      
      if (!adminPassword) {
        showNotification('Operação cancelada. A senha é obrigatória.', 'warning');
        return;
      }

      // Verificar senha (você pode ajustar a senha padrão)
      const validPassword = await verifyAdminPassword(adminPassword);
      if (!validPassword) {
        showNotification('Senha de administrador incorreta. Operação não autorizada.', 'danger');
        return;
      }

      // Iniciar processo de salvamento
      const loadingId = showLoading(`Salvando curso "${name}"...`);
      isSavingCourse = true;
      
      try {
        // Processar arrays
        const differentials = document.getElementById('courseDifferentials').value
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        const market = document.getElementById('courseMarket').value
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        const postgrad = document.getElementById('coursePostgrad').value
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        const events = document.getElementById('courseEvents').value
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        const internships = document.getElementById('courseInternships').value.trim();
        
        const courseData = {
          id: id || Date.now().toString(),
          name,
          duration,
          icon: icon || 'fas fa-book',
          modalities: selectedModalities,
          prices: Object.keys(prices).length > 0 ? prices : null,
          description,
          differentials,
          market,
          postgrad,
          events,
          internships,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.username
        };
        
        // Se for atualização, mantém o createdAt original
        if (!id) {
          courseData.createdAt = new Date().toISOString();
          courseData.createdBy = currentUser.username;
        } else {
          // Para atualizar, primeiro buscamos o curso existente
          try {
            const existingCourse = await getCourse(id);
            if (existingCourse) {
              courseData.createdAt = existingCourse.createdAt;
              courseData.createdBy = existingCourse.createdBy || currentUser.username;
            } else {
              courseData.createdAt = new Date().toISOString();
              courseData.createdBy = currentUser.username;
            }
          } catch (error) {
            courseData.createdAt = new Date().toISOString();
            courseData.createdBy = currentUser.username;
          }
        }
        
        // Salvar no banco de dados
        if (id) {
          await updateCourse(id, courseData);
        } else {
          await addCourse(courseData);
        }
        
        // Sucesso
        hideLoading(loadingId);
        isSavingCourse = false;
        
        showNotification(`Curso "${name}" ${isEditMode ? 'atualizado' : 'adicionado'} com sucesso!`, 'success', 3000);
        
        // Resetar formulário
        resetCourseForm();
        
        // Recarregar lista
        loadCourses();
        
      } catch (error) {
        hideLoading(loadingId);
        isSavingCourse = false;
        
        console.error('Erro ao salvar curso:', error);
        
        // Verificar se é erro de nome duplicado
        if (error.message && error.message.includes('key does not satisfy the uniqueness')) {
          showNotification(`Já existe um curso com o nome "${name}". Por favor, escolha um nome diferente.`, 'danger');
        } else {
          showNotification(`Erro ao salvar curso: ${error.message || 'Tente novamente.'}`, 'danger');
        }
      }
    }

    // ==============================
    // FUNÇÕES AUXILIARES PARA O SISTEMA
    // ==============================

    // Mostrar diálogo de senha
    function showPasswordDialog(message) {
      return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'password-dialog-overlay';
        dialog.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        `;
        
        dialog.innerHTML = `
          <div class="password-dialog" style="
            background: white;
            border-radius: 12px;
            padding: 30px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          ">
            <h3 style="margin-bottom: 20px; color: var(--dark); display: flex; align-items: center; gap: 10px;">
              <i class="fas fa-lock"></i> Confirmação de Segurança
            </h3>
            <p style="margin-bottom: 20px; color: var(--secondary);">${message}</p>
            
            <div class="form-group">
              <input type="password" id="adminPasswordInput" class="form-control" 
                     placeholder="Digite a senha de administrador" autocomplete="off"
                     style="margin-bottom: 20px; padding: 12px; font-size: 16px;">
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button class="btn btn-secondary" id="cancelPasswordBtn" 
                      style="padding: 10px 20px;">
                Cancelar
              </button>
              <button class="btn btn-primary" id="confirmPasswordBtn"
                      style="padding: 10px 20px;">
                <i class="fas fa-check"></i> Confirmar
              </button>
            </div>
          </div>
        `;
        
        document.body.appendChild(dialog);
        
        const passwordInput = document.getElementById('adminPasswordInput');
        passwordInput.focus();
        
        document.getElementById('cancelPasswordBtn').addEventListener('click', () => {
          document.body.removeChild(dialog);
          resolve(null);
        });
        
        document.getElementById('confirmPasswordBtn').addEventListener('click', () => {
          const password = passwordInput.value.trim();
          document.body.removeChild(dialog);
          resolve(password);
        });
        
        // Adicionar tecla Enter para confirmar
        passwordInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            document.getElementById('confirmPasswordBtn').click();
          }
        });
        
        // Fechar ao clicar fora
        dialog.addEventListener('click', (e) => {
          if (e.target === dialog) {
            document.body.removeChild(dialog);
            resolve(null);
          }
        });
      });
    }

    // Verificar senha de administrador
    async function verifyAdminPassword(password) {
      // Senha padrão - você pode mudar para uma senha do seu sistema
      const defaultPassword = 'admin123';
      
      // Verificar senha padrão
      if (password === defaultPassword) {
        return true;
      }
      
      // Opcional: verificar no banco de dados do usuário atual
      try {
        const user = await getUser(currentUser.username);
        if (user && user.senha && user.senha === password && user.role === 'admin') {
          return true;
        }
      } catch (error) {
        console.log('Não foi possível verificar senha no banco:', error);
      }
      
      return false;
    }

    // Mostrar barra de carregamento
    function showLoading(message = 'Processando...') {
      const loadingId = 'loading-' + Date.now();
      
      const loading = document.createElement('div');
      loading.id = loadingId;
      loading.className = 'loading-overlay';
      loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
      `;
      
      loading.innerHTML = `
        <div class="loading-spinner" style="
          width: 60px;
          height: 60px;
          border: 5px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: var(--primary);
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        "></div>
        <h3 style="margin-bottom: 10px; font-weight: 600;">${message}</h3>
        <p style="opacity: 0.8; font-size: 14px;">Aguarde enquanto processamos sua solicitação...</p>
      `;
      
      document.body.appendChild(loading);
      return loadingId;
    }

    // Esconder barra de carregamento
    function hideLoading(loadingId) {
      const loading = document.getElementById(loadingId);
      if (loading) {
        document.body.removeChild(loading);
      }
    }

    // Mostrar notificação
    function showNotification(message, type = 'info', duration = 3000) {
      // Remover notificações existentes
      document.querySelectorAll('.notification').forEach(n => n.remove());
      
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'var(--success)' : type === 'danger' ? 'var(--danger)' : type === 'warning' ? 'var(--warning)' : 'var(--info)'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
      `;
      
      const icons = {
        success: 'fas fa-check-circle',
        danger: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
      };
      
      notification.innerHTML = `
        <i class="${icons[type] || 'fas fa-info-circle'}" style="font-size: 20px;"></i>
        <span>${message}</span>
      `;
      
      document.body.appendChild(notification);
      
      // Auto-remover após duração
      if (duration > 0) {
        setTimeout(() => {
          if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            
            setTimeout(() => {
              if (notification.parentNode) {
                document.body.removeChild(notification);
              }
            }, 300);
          }
        }, duration);
      }
      
      return notification;
    }

    // ==============================
    // FUNÇÃO DE VALIDAÇÃO DE NOME
    // ==============================

    async function checkCourseNameExists(name, excludeId = null) {
      try {
        const courses = await getAllCourses();
        return courses.some(course => {
          const sameName = course.name.toLowerCase() === name.toLowerCase();
          const notSameCourse = excludeId ? course.id.toString() !== excludeId.toString() : true;
          return sameName && notSameCourse;
        });
      } catch (error) {
        console.error('Erro ao verificar nome do curso:', error);
        return false;
      }
    }

    // ==============================
    // ATUALIZAR A FUNÇÃO DELETE
    // ==============================

    async function deleteCoursePrompt(courseId) {
      try {
        // Limpa aspas extras se houver
        if (typeof courseId === 'string') {
          courseId = courseId.replace(/['"]/g, '');
        }
        
        if (!courseId || courseId === 'undefined' || courseId === 'null') {
          showNotification('ID do curso não especificado.', 'danger');
          return;
        }
        
        const course = await getCourse(courseId);
        
        if (!course) {
          showNotification('Curso não encontrado.', 'danger');
          return;
        }
        
        // Pedir senha de administrador para exclusão
        const adminPassword = await showPasswordDialog(`Para excluir o curso "${course.name}", digite a senha de administrador:`);
        
        if (!adminPassword) {
          showNotification('Operação cancelada.', 'warning');
          return;
        }
        
        // Verificar senha
        const validPassword = await verifyAdminPassword(adminPassword);
        if (!validPassword) {
          showNotification('Senha de administrador incorreta. Operação não autorizada.', 'danger');
          return;
        }
        
        if (!confirm(`Tem certeza que deseja excluir o curso "${course.name}"?\n\nEsta ação não pode ser desfeita.`)) {
          return;
        }
        
        const loadingId = showLoading(`Excluindo curso "${course.name}"...`);
        
        await deleteCourse(courseId);
        
        hideLoading(loadingId);
        showNotification(`Curso "${course.name}" excluído com sucesso!`, 'success', 3000);
        
        loadCourses();
        
      } catch (error) {
        console.error('Erro ao excluir curso:', error);
        showNotification(`Erro ao excluir curso: ${error.message || 'Tente novamente.'}`, 'danger');
      }
    }

    // ==============================
    // OUTRAS FUNÇÕES
    // ==============================

    function resetCourseForm() {
      document.getElementById('courseForm').reset();
      document.getElementById('courseId').value = '';
      
      // Resetar modalidades
      const modalityOptions = document.querySelectorAll('.modality-option');
      modalityOptions.forEach(option => {
        option.classList.remove('selected');
        const checkbox = option.querySelector('input[type="checkbox"]');
        checkbox.checked = false;
        
        // Ocultar campos de preço
        const modality = option.getAttribute('data-modality');
        const priceContainer = document.getElementById(`price${modality.charAt(0).toUpperCase() + modality.slice(1)}`);
        if (priceContainer) {
          priceContainer.style.display = 'none';
        }
      });
      
      document.getElementById('courseFormTitle').textContent = 'Adicionar Novo Curso';
      document.getElementById('saveCourseBtn').innerHTML = '<i class="fas fa-save"></i> Salvar Curso';
      document.getElementById('cancelCourseBtn').style.display = 'none';
    }

    // ==============================
    // PÁGINA LGPD
    // ==============================
    
    async function updateLGPDPage() {
      // Pode-se adicionar lógica personalizada aqui se necessário
    }

    // ==============================
    // FUNÇÕES AUXILIARES
    // ==============================

    function clearCache() {
      if (!confirm('Tem certeza que deseja limpar o cache do navegador?')) {
        return;
      }
      
      try {
        sessionStorage.clear();
        showNotification('Cache limpo com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao limpar cache:', error);
        showNotification('Erro ao limpar cache.', 'danger');
      }
    }

    // ==============================
    // INICIALIZAÇÃO DO SISTEMA
    // ==============================

    async function initializeSystem() {
      try {
        const loggedUser = checkAuth();
        if (!loggedUser) {
          console.log('Nenhum usuário autenticado — iniciando como visitante.');
          currentUser = { username: 'guest', nome: 'Visitante', role: 'user' };
        } else {
          currentUser = loggedUser;
        }
        
        await initDatabase();
        
        const users = await getAllUsers();
        if (users.length === 0) {
          const initialUsers = [
            {
              username: 'admin',
              nome: 'Administrador',
              senha: 'admin123',
              role: 'admin',
              status: 'active',
              firstLogin: false,
              lastAccess: null
            },
            {
              username: 'lisandra',
              nome: 'Lisandra',
              senha: 'lisandra123',
              role: 'user',
              status: 'active',
              firstLogin: true,
              lastAccess: null
            }
          ];
          
          for (const user of initialUsers) {
            await addUser(user);
          }
          
          const initialCourses = [
            {
              id: '1',
              name: 'Farmácia',
              duration: '5 anos (bacharelado)',
              icon: 'fas fa-pills',
              description: 'O curso de Farmácia forma profissionais para atuar em todas as etapas da cadeia farmacêutica, desde a produção até o acompanhamento terapêutico dos pacientes.',
              modalities: ['presencial', 'semipresencial', 'ead'],
              prices: {
                presencial: '1250.00',
                semipresencial: '980.00',
                ead: '750.00'
              },
              differentials: ['Laboratórios equipados com tecnologia de ponta', 'Parcerias com redes de farmácias e hospitais', 'Corpo docente com experiência no mercado farmacêutico'],
              market: ['Farmacêutico Hospitalar: R$ 4.200 - R$ 6.800', 'Farmacêutico de Drogaria: R$ 3.800 - R$ 5.500', 'Farmacêutico Industrial: R$ 5.000 - R$ 8.000'],
              postgrad: ['Farmácia Hospitalar', 'Farmácia Clínica', 'Cosmetologia', 'Análises Clínicas'],
              events: ['Semana da Farmácia', 'Visitas técnicas a indústrias farmacêuticas', 'Feira de Carreiras Farmacêuticas'],
              internships: 'Estágios obrigatórios em farmácias comunitárias, hospitalares e indústrias.',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'admin',
              updatedBy: 'admin'
            },
            {
              id: '2',
              name: 'Direito',
              duration: '5 anos (bacharelado)',
              icon: 'fas fa-balance-scale',
              description: 'O curso de Direito é um curso de graduação bacharelado com duração de 5 anos que tem como missão formar profissionais com base teórica sólida, visão crítica e responsabilidade social.',
              modalities: ['presencial', 'aovivo', 'ead'],
              prices: {
                presencial: '1350.00',
                aovivo: '1100.00',
                ead: '850.00'
              },
              differentials: ['NPJ (Núcleo de Prática Jurídica) referência em atendimento gratuito', 'Simulações de júri e audiências', 'Biblioteca jurídica com acervo atualizado'],
              market: ['Advogado Júnior: R$ 2.500 - R$ 4.600', 'Advogado Pleno: R$ 6.000 - R$ 12.000', 'Advogado Sênior: R$ 8.000 - R$ 22.000'],
              postgrad: ['Direito de Família', 'Direito Ambiental', 'Direito Penal e Processual Penal'],
              events: ['Aula inaugural', 'Cerimônia do Vade Mecum', 'Semana Acadêmica'],
              internships: 'Estágio supervisionado em NPJ; estágios em órgãos públicos e escritórios parceiros.',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'admin',
              updatedBy: 'admin'
            }
          ];
          
          for (const course of initialCourses) {
            await addCourse(course);
          }
          
          console.log('Dados iniciais carregados com sucesso');
        }
        
        updateUserInterface();
        setupNavigation();
        updateDashboardStats();
        updateApiStatus();
        
        document.getElementById('app').style.display = 'flex';
        
        console.log('Sistema inicializado com sucesso');
        
      } catch (error) {
        console.error('Erro ao inicializar sistema:', error);
        showNotification('Erro ao inicializar sistema. Por favor, recarregue a página.', 'danger');
      }
    }

    async function addUser(user) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        const request = store.add(user);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    document.addEventListener('DOMContentLoaded', initializeSystem);

    window.logout = logout;
    window.clearCache = clearCache;
    window.sendMessage = sendMessage;
    window.handleKeyPress = handleKeyPress;
    window.submitFeedback = submitFeedback;
    window.saveCourse = saveCourse;
    window.resetCourseForm = resetCourseForm;
    window.editCourse = editCourse;
    window.deleteCoursePrompt = deleteCoursePrompt;
    window.loadFeedbacks = loadFeedbacks;

    function updateApiStatus() {
      const badge = document.getElementById('apiStatusBadge');
      if (!badge) return;
      const key = localStorage.getItem('openrouterApiKey');
      if (key) {
        badge.textContent = 'API: Configurada';
        badge.style.color = 'var(--success)';
      } else {
        badge.textContent = 'API: Offline';
        badge.style.color = 'var(--danger)';
      }
    }

    window.addEventListener('storage', (e) => {
      if (e.key === 'openrouterApiKey') updateApiStatus();
    });
  </script>
