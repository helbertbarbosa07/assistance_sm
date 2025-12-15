let currentUser = null;

function logout() {
  localStorage.removeItem('assistance_logged_user');
  sessionStorage.clear();
  window.location.href = 'login.html';
}

function updateUserInterface() {
  if (!currentUser) return;
  
  const elements = {
    userName: document.getElementById('userName'),
    userFullName: document.getElementById('userFullName'),
    userRole: document.getElementById('userRole'),
    userRoleBadge: document.getElementById('userRoleBadge'),
    userAvatar: document.getElementById('userAvatar'),
    userAvatarLarge: document.getElementById('userAvatarLarge')
  };
  
  // Atualizar textos
  if (elements.userName) elements.userName.textContent = currentUser.nome;
  if (elements.userFullName) elements.userFullName.textContent = currentUser.nome;
  
  const roleText = currentUser.role === 'admin' ? 'Administrador' : 'Usuário';
  if (elements.userRole) elements.userRole.textContent = roleText;
  if (elements.userRoleBadge) elements.userRoleBadge.textContent = roleText;
  
  // Atualizar avatar
  const initials = currentUser.nome.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  if (elements.userAvatar) elements.userAvatar.textContent = initials;
  if (elements.userAvatarLarge) elements.userAvatarLarge.textContent = initials;
  
  // Mensagem de boas-vindas
  const hour = new Date().getHours();
  let greeting = '';
  if (hour < 12) greeting = 'Bom dia';
  else if (hour < 18) greeting = 'Boa tarde';
  else greeting = 'Boa noite';
  
  const welcomeMessage = document.getElementById('welcomeMessage');
  if (welcomeMessage) {
    welcomeMessage.innerHTML = `${greeting}, <strong>${currentUser.nome}</strong>!`;
  }
}
