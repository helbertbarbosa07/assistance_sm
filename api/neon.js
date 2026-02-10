const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// CONFIGURAÇÃO DO BANCO DE DADOS PARA VERCEL
// ==============================

// Verificar se DATABASE_URL está configurada
if (!process.env.DATABASE_URL) {
  console.error('❌ ERRO: DATABASE_URL não está configurada no Vercel!');
  console.log('Configure a variável de ambiente DATABASE_URL no painel do Vercel:');
  console.log('1. Vá para seu projeto no Vercel');
  console.log('2. Clique em Settings > Environment Variables');
  console.log('3. Adicione DATABASE_URL com sua conexão Neon PostgreSQL');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Testar conexão
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erro ao conectar com PostgreSQL:', err.message);
  } else {
    console.log('✅ Conectado ao PostgreSQL com sucesso!');
    console.log('📊 Host:', client.connectionParameters?.host || 'Neon PostgreSQL');
    release();
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token de autenticação necessário' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'assistance-sm-secret-key-2024', (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Token inválido ou expirado' 
      });
    }
    req.user = user;
    next();
  });
};

// ==============================
// INICIALIZAÇÃO DO BANCO (CRIAR TABELAS SE NÃO EXISTIREM)
// ==============================
async function initializeDatabase() {
  try {
    // Criar tabela de usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        avatar VARCHAR(10),
        ativo BOOLEAN DEFAULT true,
        ultimo_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Criar tabela de cursos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cursos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        descricao TEXT,
        duracao VARCHAR(50),
        vagas INTEGER DEFAULT 0,
        investimento VARCHAR(100),
        carreira TEXT,
        tags TEXT,
        cor VARCHAR(7) DEFAULT '#4361ee',
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Criar tabela de interações
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interacoes_ia (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER,
        curso_id INTEGER,
        pergunta TEXT NOT NULL,
        resposta TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Banco de dados inicializado!');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error.message);
  }
}

initializeDatabase();

// ==============================
// ROTAS PRINCIPAIS
// ==============================

// Rota de saúde da API
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'online', 
      database: 'connected',
      timestamp: new Date().toISOString(),
      service: 'Assistance SM API',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'online', 
      database: 'disconnected',
      error: error.message
    });
  }
});

// Login de usuário
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;
    
    // Se for usuário normal (não admin)
    if (!isAdmin) {
      const userName = username || 'Visitante';
      const user = {
        id: `local_${Date.now()}`,
        name: userName,
        role: 'user',
        avatar: userName.charAt(0).toUpperCase()
      };
      
      const token = jwt.sign(
        user, 
        process.env.JWT_SECRET || 'assistance-sm-secret-key-2024', 
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        token,
        user
      });
    }
    
    // Se for admin com credenciais padrão
    if (username === 'admin' && password === 'admin123') {
      const adminUser = {
        id: 'admin_1',
        name: 'Administrador',
        email: 'admin@assistance.com',
        role: 'admin',
        avatar: 'A'
      };
      
      const token = jwt.sign(
        adminUser, 
        process.env.JWT_SECRET || 'assistance-sm-secret-key-2024', 
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        token,
        user: adminUser
      });
    }
    
    // Se não for credenciais conhecidas, retornar erro
    return res.status(401).json({
      success: false,
      message: 'Credenciais inválidas'
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Listar cursos (público)
app.get('/api/cursos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nome, descricao, duracao, vagas, investimento, 
             carreira, tags, cor, ativo, created_at
      FROM cursos 
      WHERE ativo = true
      ORDER BY nome
    `);
    
    // Converter tags para array
    const cursos = result.rows.map(curso => ({
      ...curso,
      tags: curso.tags ? curso.tags.split(',').map(tag => tag.trim()) : []
    }));
    
    res.json(cursos);
  } catch (error) {
    console.error('Erro ao buscar cursos:', error);
    res.status(500).json({ error: 'Erro ao buscar cursos' });
  }
});

// Buscar curso por ID
app.get('/api/cursos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM cursos WHERE id = $1 AND ativo = true',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    
    const curso = result.rows[0];
    curso.tags = curso.tags ? curso.tags.split(',').map(tag => tag.trim()) : [];
    
    res.json(curso);
  } catch (error) {
    console.error('Erro ao buscar curso:', error);
    res.status(500).json({ error: 'Erro ao buscar curso' });
  }
});

// Criar curso (admin)
app.post('/api/cursos', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { nome, descricao, duracao, vagas, investimento, carreira, tags, cor, ativo } = req.body;
    
    if (!nome || !descricao) {
      return res.status(400).json({ error: 'Nome e descrição são obrigatórios' });
    }
    
    const tagsString = Array.isArray(tags) ? tags.join(', ') : tags;
    
    const result = await pool.query(
      `INSERT INTO cursos (nome, descricao, duracao, vagas, investimento, carreira, tags, cor, ativo) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [nome, descricao, duracao || 'Não informado', vagas || 0, investimento || 'Não informado', 
       carreira || '', tagsString || '', cor || '#4361ee', ativo !== false]
    );
    
    const curso = result.rows[0];
    curso.tags = curso.tags ? curso.tags.split(',').map(tag => tag.trim()) : [];
    
    res.status(201).json(curso);
  } catch (error) {
    console.error('Erro ao criar curso:', error);
    res.status(500).json({ error: 'Erro ao criar curso' });
  }
});

// Atualizar curso (admin)
app.put('/api/cursos/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { id } = req.params;
    const { nome, descricao, duracao, vagas, investimento, carreira, tags, cor, ativo } = req.body;
    
    const tagsString = Array.isArray(tags) ? tags.join(', ') : tags;
    
    const result = await pool.query(
      `UPDATE cursos 
       SET nome = $1, descricao = $2, duracao = $3, vagas = $4, investimento = $5, 
           carreira = $6, tags = $7, cor = $8, ativo = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 
       RETURNING *`,
      [nome, descricao, duracao || 'Não informado', vagas || 0, investimento || 'Não informado',
       carreira || '', tagsString || '', cor || '#4361ee', ativo !== false, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    
    const curso = result.rows[0];
    curso.tags = curso.tags ? curso.tags.split(',').map(tag => tag.trim()) : [];
    
    res.json(curso);
  } catch (error) {
    console.error('Erro ao atualizar curso:', error);
    res.status(500).json({ error: 'Erro ao atualizar curso' });
  }
});

// Deletar curso (admin)
app.delete('/api/cursos/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM cursos WHERE id = $1 RETURNING id, nome',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    
    res.json({ 
      success: true, 
      message: 'Curso excluído com sucesso',
      curso: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao excluir curso:', error);
    res.status(500).json({ error: 'Erro ao excluir curso' });
  }
});

// Salvar interação de chat
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { usuario_id, curso_id, pergunta, resposta } = req.body;
    
    // Se for usuário local, não salvar
    if (usuario_id && usuario_id.startsWith('local_')) {
      return res.json({
        success: true,
        message: 'Interação de usuário local registrada',
        local: true
      });
    }
    
    const result = await pool.query(
      `INSERT INTO interacoes_ia (usuario_id, curso_id, pergunta, resposta) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [usuario_id, curso_id, pergunta, resposta]
    );
    
    res.status(201).json({
      success: true,
      interacao: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao salvar interação:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao salvar interação'
    });
  }
});

// Dashboard stats (admin)
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const [usuarios, cursos, interacoes] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM usuarios WHERE ativo = true'),
      pool.query('SELECT COUNT(*) as total FROM cursos WHERE ativo = true'),
      pool.query('SELECT COUNT(*) as total FROM interacoes_ia')
    ]);
    
    res.json({
      total_usuarios: parseInt(usuarios.rows[0].total),
      total_cursos: parseInt(cursos.rows[0].total),
      total_interacoes: parseInt(interacoes.rows[0].total),
      usuarios_ativos: 0,
      taxa_engajamento: '0%'
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API Assistance SM funcionando no Vercel!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    database: 'Neon PostgreSQL via Vercel'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    name: 'Assistance SM API',
    version: '1.0.0',
    status: 'online',
    endpoints: [
      '/api/health',
      '/api/cursos',
      '/api/auth/login',
      '/api/test'
    ],
    documentation: 'Sistema de gestão educacional com IA'
  });
});

// Rota 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Assistance SM rodando na porta ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`💾 Banco: ${process.env.DATABASE_URL ? 'Configurado' : 'URL não configurada'}`);
});
