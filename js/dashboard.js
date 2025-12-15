async function updateDashboardStats() {
  try {
    const courses = await getAllCourses();
    const feedbacks = await getAllFeedbacks();
    const users = await getAllUsers();
    
    const statsContainer = document.getElementById('dashboardStats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-user-circle"></i>
          </div>
          <div class="stat-info">
            <h3>${currentUser.username}</h3>
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
    }
    
    // Atualizar contadores
    const cursosCount = document.getElementById('totalCursosCount');
    const feedbacksCount = document.getElementById('totalFeedbacksCount');
    
    if (cursosCount) cursosCount.textContent = courses.length;
    if (feedbacksCount) feedbacksCount.textContent = feedbacks.length;
    
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}
