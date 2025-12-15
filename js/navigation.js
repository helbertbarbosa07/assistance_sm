function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      const pageId = this.getAttribute('data-page');
      loadPage(pageId, this);
    });
  });
}

function loadPage(pageId, navElement) {
  // Remover classe active de todos
  document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  
  // Adicionar classe active aos selecionados
  navElement.classList.add('active');
  document.getElementById(`${pageId}Page`).classList.add('active');
  
  // Inicializar página específica
  switch(pageId) {
    case 'dashboard':
      updateDashboardStats();
      break;
    case 'ia':
      initChatPage();
      break;
    case 'courses':
      initCoursesPage();
      break;
    case 'feedback':
      initFeedbackPage();
      break;
  }
}
