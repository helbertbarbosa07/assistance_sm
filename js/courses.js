async function initCoursesPage() {
  // Criar estrutura da página
  const page = document.getElementById('coursesPage');
  if (!page.querySelector('.container')) {
    page.innerHTML = `
      <div class="container">
        <div class="courses-management-container">
          <div class="courses-header">
            <div class="courses-title-section">
              <div class="courses-icon">
                <i class="fas fa-book"></i>
              </div>
              <div>
                <h1 class="courses-title">Gestão de Cursos</h1>
                <p class="courses-subtitle">Gerencie e explore todos os cursos disponíveis</p>
              </div>
            </div>
            
            <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <button class="btn btn-success" onclick="showAddCourseForm()" id="addCourseBtn">
                  <i class="fas fa-plus"></i> Adicionar Novo Curso
                </button>
                <button class="btn btn-info" onclick="loadCourses()" style="margin-left: 10px;">
                  <i class="fas fa-sync"></i> Atualizar Lista
                </button>
              </div>
              <div style="font-size: 14px; color: var(--secondary);">
                <i class="fas fa-info-circle"></i> Total: <span id="totalCoursesCount">0</span> cursos
              </div>
            </div>
          </div>
          
          <div class="course-form-container" id="courseFormContainer" style="display: none;">
            <!-- Formulário será inserido aqui -->
          </div>
          
          <div class="courses-table-container">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--dark); margin: 30px 0 20px 0; display: flex; align-items: center; gap: 10px;">
              <i class="fas fa-list"></i> Cursos Cadastrados
            </h3>
            
            <div id="coursesList">
              <!-- Cursos serão carregados aqui -->
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  await loadCourses();
  await updateCoursesCount();
}

async function updateCoursesCount() {
  try {
    const courses = await getAllCourses();
    const countElement = document.getElementById('totalCoursesCount');
    if (countElement) {
      countElement.textContent = courses.length;
    }
  } catch (error) {
    console.error('Erro ao atualizar contador de cursos:', error);
  }
}

async function loadCourses() {
  try {
    const courses = await getAllCourses();
    const container = document.getElementById('coursesList');
    
    if (!container) return;
    
    if (courses.length === 0) {
      container.innerHTML = `
        <div class="no-courses">
          <i class="fas fa-book-open"></i>
          <h3>Nenhum curso cadastrado</h3>
          <p>Clique em "Adicionar Novo Curso" para começar!</p>
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
            <th>Diferenciais</th>
            <th>Mercado</th>
            <th>Modalidades</th>
            <th style="text-align: right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${courses.map(course => {
            const differentials = course.differentials?.slice(0, 2).join(', ') || 'Sem diferenciais';
            const market = course.market?.[0]?.split(':')[0] || 'Não informado';
            const modalidades = course.modalidades?.slice(0, 2).join(', ') || 'Não informado';
            
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
                <td>${differentials}</td>
                <td>${market}</td>
                <td>${modalidades}</td>
                <td>
                  <div class="course-actions">
                    <button class="btn btn-sm btn-info" onclick="viewCourseDetails('${course.id}')">
                      <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="editCourse('${course.id}')">
                      <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCoursePrompt('${course.id}')">
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
    const container = document.getElementById('coursesList');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle"></i>
          Erro ao carregar cursos. Tente recarregar a página.
        </div>
      `;
    }
  }
}

function showAddCourseForm() {
  const container = document.getElementById('courseFormContainer');
  if (!container) return;
  
  container.innerHTML = `
    <div class="form-header">
      <div class="form-icon">
        <i class="fas fa-plus"></i>
      </div>
      <h3 id="courseFormTitle">Adicionar Novo Curso</h3>
      <button class="btn btn-sm btn-secondary" onclick="hideCourseForm()" style="margin-left: auto;">
        <i class="fas fa-times"></i> Fechar
      </button>
    </div>
    
    <form id="courseForm">
      <input type="hidden" id="courseId">
      
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label required">
            <i class="fas fa-book"></i> Nome do Curso
          </label>
          <input type="text" id="courseName" class="form-control" required placeholder="Ex: Direito">
        </div>
        
        <div class="form-group">
          <label class="form-label required">
            <i class="fas fa-clock"></i> Duração
          </label>
          <input type="text" id="courseDuration" class="form-control" required placeholder="Ex: 5 anos (bacharelado)">
        </div>
        
        <div class="form-group">
          <label class="form-label">
            <i class="fas fa-icons"></i> Ícone (Font Awesome)
          </label>
          <input type="text" id="courseIcon" class="form-control" placeholder="Ex: fas fa-graduation-cap">
          <small style="color: var(--secondary); font-size: 12px; margin-top: 5px; display: block;">
            Use classes do Font Awesome (ex: fas fa-book, fas fa-user-md)
          </small>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label required">
          <i class="fas fa-align-left"></i> Descrição Completa
        </label>
        <textarea id="courseDescription" class="form-control" rows="4" required placeholder="Descreva o curso..."></textarea>
      </div>
      
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">
            <i class="fas fa-star"></i> Diferenciais
          </label>
          <textarea id="courseDifferentials" class="form-control" rows="3" placeholder="Cada diferencial em uma linha"></textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">
            <i class="fas fa-briefcase"></i> Mercado de Trabalho
          </label>
          <textarea id="courseMarket" class="form-control" rows="3" 
                    placeholder="Ex: Advogado Júnior: R$ 2.500 - R$ 4.600
Advogado Pleno: R$ 6.000 - R$ 12.000
Advogado Sênior: R$ 8.000 - R$ 22.000"></textarea>
          <small style="color: var(--secondary); font-size: 12px; margin-top: 5px; display: block;">
            Uma linha por cargo/salário
          </small>
        </div>
      </div>
      
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">
            <i class="fas fa-graduation-cap"></i> Especializações
          </label>
          <textarea id="coursePostgrad" class="form-control" rows="3" placeholder="Ex: Direito de Família"></textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">
            <i class="fas fa-calendar-alt"></i> Eventos e Visitas
          </label>
          <textarea id="courseEvents" class="form-control" rows="3" placeholder="Ex: Semana Acadêmica"></textarea>
        </div>
      </div>
      
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">
            <i class="fas fa-building"></i> Locais de Estágio
          </label>
          <textarea id="courseInternships" class="form-control" rows="3" 
                    placeholder="Ex: Escritórios de advocacia
Órgãos públicos
Tribunais"></textarea>
          <small style="color: var(--secondary); font-size: 12px; margin-top: 5px; display: block;">
            Locais onde os alunos podem estagiar
          </small>
        </div>
        
        <div class="form-group">
          <label class="form-label">
            <i class="fas fa-graduation-cap"></i> Modalidades Oferecidas
          </label>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="modalidadePresencial" checked>
              <label for="modalidadePresencial">🎓 Presencial</label>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="modalidadeSemipresencial" checked>
              <label for="modalidadeSemipresencial">🔄 Semipresencial</label>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="modalidadeOnline" checked>
              <label for="modalidadeOnline">📹 Ao Vivo (Online)</label>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="modalidadeEAD" checked>
              <label for="modalidadeEAD">💻 EAD 100%</label>
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn btn-primary btn-lg" onclick="saveCourse()" id="saveCourseBtn">
          <i class="fas fa-save"></i> Salvar Curso
        </button>
        <button type="button" class="btn btn-danger btn-lg" onclick="resetCourseForm()" id="cancelCourseBtn" style="display: none;">
          <i class="fas fa-times"></i> Cancelar Edição
        </button>
      </div>
    </form>
  `;
  
  container.style.display = 'block';
  container.scrollIntoView({ behavior: 'smooth' });
}

function hideCourseForm() {
  const container = document.getElementById('courseFormContainer');
  if (container) {
    container.style.display = 'none';
  }
}

async function saveCourse() {
  const id = document.getElementById('courseId').value;
  const name = document.getElementById('courseName').value.trim();
  const duration = document.getElementById('courseDuration').value.trim();
  const icon = document.getElementById('courseIcon').value.trim();
  const description = document.getElementById('courseDescription').value.trim();
  
  if (!name || !duration || !description) {
    alert('Por favor, preencha os campos obrigatórios (Nome, Duração, Descrição).');
    return;
  }
  
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
  
  const modalidades = [];
  if (document.getElementById('modalidadePresencial').checked) modalidades.push('Presencial');
  if (document.getElementById('modalidadeSemipresencial').checked) modalidades.push('Semipresencial');
  if (document.getElementById('modalidadeOnline').checked) modalidades.push('Ao Vivo (Online)');
  if (document.getElementById('modalidadeEAD').checked) modalidades.push('EAD 100%');
  
  const courseData = {
    id: id || Date.now().toString(),
    name,
    duration,
    icon: icon || 'fas fa-book',
    description,
    differentials,
    market,
    postgrad,
    events,
    internships,
    modalidades,
    updatedAt: new Date().toISOString()
  };
  
  try {
    if (id) {
      const existingCourse = await getCourse(id);
      courseData.createdAt = existingCourse ? existingCourse.createdAt : new Date().toISOString();
      await updateCourse(id, courseData);
    } else {
      courseData.createdAt = new Date().toISOString();
      await addCourse(courseData);
    }
    
    const notification = document.createElement('div');
    notification.className = 'alert alert-success';
    notification.innerHTML = `<i class="fas fa-check-circle"></i> Curso ${id ? 'atualizado' : 'adicionado'} com sucesso!`;
    
    const container = document.getElementById('courseFormContainer');
    const formActions = container.querySelector('.form-actions');
    container.insertBefore(notification, formActions);
    
    setTimeout(() => notification.remove(), 3000);
    
    resetCourseForm();
    hideCourseForm();
    loadCourses();
    updateCoursesCount();
    
  } catch (error) {
    console.error('Erro ao salvar curso:', error);
    alert('Erro ao salvar curso. Tente novamente.');
  }
}

async function editCourse(courseId) {
  try {
    const course = await getCourse(courseId);
    
    if (!course) {
      alert('Curso não encontrado.');
      return;
    }
    
    // Mostrar formulário se estiver escondido
    showAddCourseForm();
    
    // Preencher campos
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
    if (course.modalidades) {
      document.getElementById('modalidadePresencial').checked = course.modalidades.includes('Presencial');
      document.getElementById('modalidadeSemipresencial').checked = course.modalidades.includes('Semipresencial');
      document.getElementById('modalidadeOnline').checked = course.modalidades.includes('Ao Vivo (Online)');
      document.getElementById('modalidadeEAD').checked = course.modalidades.includes('EAD 100%');
    }
    
    document.getElementById('courseFormTitle').textContent = 'Editar Curso';
    document.getElementById('saveCourseBtn').innerHTML = '<i class="fas fa-save"></i> Atualizar Curso';
    document.getElementById('cancelCourseBtn').style.display = 'inline-flex';
    
  } catch (error) {
    console.error('Erro ao carregar curso:', error);
    alert('Erro ao carregar curso para edição.');
  }
}

function resetCourseForm() {
  const form = document.getElementById('courseForm');
  if (form) form.reset();
  
  const courseId = document.getElementById('courseId');
  if (courseId) courseId.value = '';
  
  const formTitle = document.getElementById('courseFormTitle');
  if (formTitle) formTitle.textContent = 'Adicionar Novo Curso';
  
  const saveBtn = document.getElementById('saveCourseBtn');
  if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Curso';
  
  const cancelBtn = document.getElementById('cancelCourseBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  
  // Resetar checkboxes
  const checkboxes = ['modalidadePresencial', 'modalidadeSemipresencial', 'modalidadeOnline', 'modalidadeEAD'];
  checkboxes.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) checkbox.checked = true;
  });
}

async function deleteCoursePrompt(courseId) {
  if (!confirm('Tem certeza que deseja excluir este curso? Esta ação não pode ser desfeita.')) {
    return;
  }
  
  try {
    const course = await getCourse(courseId);
    await deleteCourse(courseId);
    
    const notification = document.createElement('div');
    notification.className = 'alert alert-success';
    notification.innerHTML = `<i class="fas fa-check-circle"></i> Curso "${course.name}" excluído com sucesso!`;
    
    const tableContainer = document.querySelector('.courses-table-container');
    const coursesList = document.getElementById('coursesList');
    tableContainer.insertBefore(notification, coursesList);
    
    setTimeout(() => notification.remove(), 3000);
    
    loadCourses();
    updateCoursesCount();
    
  } catch (error) {
    console.error('Erro ao excluir curso:', error);
    alert('Erro ao excluir curso. Tente novamente.');
  }
}

async function viewCourseDetails(courseId) {
  try {
    const course = await getCourse(courseId);
    
    if (!course) {
      alert('Curso não encontrado.');
      return;
    }
    
    const modalidades = course.modalidades?.join(', ') || 'Presencial, Semipresencial, Ao Vivo (Online), EAD 100%';
    
    const details = `
📚 **${course.name}**
⏰ **Duração:** ${course.duration}

🎯 **Diferenciais:**
${course.differentials?.map(d => `• ${d}`).join('\n') || '• Sem diferenciais cadastrados'}

💼 **Mercado de Trabalho:**
${course.market?.map(m => `• ${m}`).join('\n') || '• Não informado'}

🎓 **Especializações:**
${course.postgrad?.map(p => `• ${p}`).join('\n') || '• Não informado'}

📅 **Eventos:**
${course.events?.map(e => `• ${e}`).join('\n') || '• Não informado'}

👨‍💼 **Estágios:**
${course.internships || 'Não informado'}

🔄 **Modalidades:**
${modalidades.split(', ').map(m => `• ${m}`).join('\n')}
    `;
    
    alert(details);
    
  } catch (error) {
    console.error('Erro ao carregar detalhes do curso:', error);
    alert('Erro ao carregar detalhes do curso.');
  }
}

// Expor funções globalmente
window.showAddCourseForm = showAddCourseForm;
window.hideCourseForm = hideCourseForm;
window.saveCourse = saveCourse;
window.resetCourseForm = resetCourseForm;
window.editCourse = editCourse;
window.deleteCoursePrompt = deleteCoursePrompt;
window.viewCourseDetails = viewCourseDetails;
window.loadCourses = loadCourses;
