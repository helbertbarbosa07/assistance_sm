// Banco de dados IndexedDB
let db;

function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AssistanceSistemaDB', 11);
    
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
      
      if (!db.objectStoreNames.contains('users')) {
        const usersStore = db.createObjectStore('users', { keyPath: 'username' });
        usersStore.createIndex('nome', 'nome', { unique: false });
        usersStore.createIndex('role', 'role', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('courses')) {
        const coursesStore = db.createObjectStore('courses', { keyPath: 'id' });
        coursesStore.createIndex('name', 'name', { unique: true });
      }
      
      if (!db.objectStoreNames.contains('feedbacks')) {
        const feedbacksStore = db.createObjectStore('feedbacks', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        feedbacksStore.createIndex('userId', 'userId', { unique: false });
        feedbacksStore.createIndex('date', 'date', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('chats')) {
        const chatsStore = db.createObjectStore('chats', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        chatsStore.createIndex('userId', 'userId', { unique: false });
        chatsStore.createIndex('courseId', 'courseId', { unique: false });
      }
    };
  });
}

// Funções de usuário
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

async function addUser(user) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    const request = store.add(user);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Funções de cursos
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

// Funções de feedback
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

// Funções de chat
async function addChat(chat) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats'], 'readwrite');
    const store = transaction.objectStore('chats');
    const request = store.add(chat);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getChatsByUser(userId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats'], 'readonly');
    const store = transaction.objectStore('chats');
    const index = store.index('userId');
    const request = index.getAll(userId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
