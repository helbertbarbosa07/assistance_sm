// api/index.js - ATUALIZADO COM SUA CONEXÃO NEON
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// CONFIGURAÇÃO DO BANCO DE DADOS NEON (SUA CONEXÃO)
// ==============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_hv18nwxNcjMK@ep-lingering-mode-acfl6cod-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Número máximo de clientes no pool
  idleTimeoutMillis: 30000, // Tempo que um cliente pode ficar ocioso
  connectionTimeoutMillis: 2000, // Tempo máximo para tentar conectar
});

// Testar conexão com o banco
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erro ao conectar com Neon PostgreSQL:', err.message);
  } else {
    console.log('✅ Conectado ao Neon PostgreSQL com sucesso!');
    console.log('📊 Host:', client.connectionParameters.host);
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
// INICIALIZAÇÃO DO BANCO DE DADOS
// ==============================
async function initializeDatabase() {
  try {
    // Criar tabelas se não existirem
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cursos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        descricao TEXT,
        duracao VARCHAR(50),
        vagas INTEGER DEFAULT 0,
        investimento VARCHAR(100),
        carreira TEXT,
        tags TEXT, -- Alterado de JSONB para TEXT para compatibilidade
        cor VARCHAR(7) DEFAULT '#4361ee',
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    // Criar índices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_interacoes_usuario ON interacoes_ia(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_interacoes_curso ON interacoes_ia(curso_id);
      CREATE INDEX IF NOT EXISTS idx_interacoes_data ON interacoes_ia(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_cursos_ativo ON cursos(ativo);
      CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
    `);

    // Verificar se existe admin
    const adminCheck = await pool.query(
      "SELECT id FROM usuarios WHERE email = 'admin@assistance.com'"
    );

    if (adminCheck.rows.length === 0) {
      // Criar usuário admin padrão
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      await pool.query(`
        INSERT INTO usuarios (nome, email, senha_hash, role, avatar, ativo) 
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'Administrador',
        'admin@assistance.com',
        hashedPassword,
        'admin',
        'A',
        true
      ]);
      
      console.log('👑 Usuário admin criado: admin@assistance.com / Admin@123');
    }

    // Inserir cursos de exemplo se não existirem
    const cursosCheck = await pool.query("SELECT COUNT(*) FROM cursos");
    
    if (parseInt(cursosCheck.rows[0].count) === 0) {
      const cursosExemplo = [
        ['Medicina', 'Formação completa em medicina com especializações em diversas áreas da saúde', '6 anos', 120, 'R$ 8.500/mês', 'Saúde, Presencial, Integral', '#ef4444'],
        ['Engenharia Civil', 'Projetos, construção e manutenção de estruturas e obras de infraestrutura', '5 anos', 200, 'R$ 1.800/mês', 'Exatas, Presencial, Noturno', '#3b82f6'],
        ['Direito', 'Formação em ciências jurídicas e sociais, preparando para carreiras públicas e privadas', '5 anos', 180, 'R$ 2.200/mês', 'Humanas, Presencial, Diurno', '#10b981'],
        ['Ciência da Computação', 'Desenvolvimento de software, inteligência artificial e sistemas computacionais', '4 anos', 150, 'R$ 1.900/mês', 'Tecnologia, Presencial, Programação', '#8b5cf6'],
        ['Administração', 'Gestão empresarial, finanças e estratégias organizacionais', '4 anos', 220, 'R$ 1.600/mês', 'Negócios, Presencial, Gestão', '#f59e0b'],
        ['Psicologia', 'Estudo do comportamento humano e processos mentais', '5 anos', 100, 'R$ 2.500/mês', 'Saúde, Humanas, Clínica', '#ec4899']
      ];

      for (const curso of cursosExemplo) {
        await pool.query(`
          INSERT INTO cursos (nome, descricao, duracao, vagas, investimento, tags, cor, ativo)
          VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        `, curso);
      }
      
      console.log('📚 6 cursos de exemplo inseridos');
    }

    console.log('✅ Banco de dados inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error.message);
  }
}

// Chamar inicialização do banco
initializeDatabase();

// ==============================
// ROTAS DE AUTENTICAÇÃO
// ==============================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;
    
    // Se for login de usuário sem senha (visitante)
    if (!isAdmin && (!username || username === 'Visitante' || username === 'visitante')) {
      const user = {
        id: `local_${Date.now()}`,
        name: username || 'Visitante',
        role: 'user',
        avatar: (username || 'V').charAt(0).toUpperCase()
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
    
    // Buscar usuário no banco de dados
    const query = `
      SELECT id, nome, email, senha_hash, role, ativo, avatar
      FROM usuarios 
      WHERE LOWER(nome) = LOWER($1) OR LOWER(email) = LOWER($1)
    `;
    
    const result = await pool.query(query, [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    const user = result.rows[0];
    
    // Verificar se o usuário está ativo
    if (!user.ativo) {
      return res.status(403).json({
        success: false,
        message: 'Usuário desativado'
      });
    }
    
    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.senha_hash);
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Senha incorreta'
      });
    }
    
    // Atualizar último login
    await pool.query(
      'UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Gerar token JWT
    const tokenPayload = {
      id: user.id,
      name: user.nome,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    };
    
    const token = jwt.sign(
      tokenPayload, 
      process.env.JWT_SECRET || 'assistance-sm-secret-key-2024', 
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: tokenPayload
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Registrar novo usuário
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    
    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são obrigatórios'
      });
    }
    
    // Verificar se email já existe
    const existingUser = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email já cadastrado'
      });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 10);
    const avatar = nome.charAt(0).toUpperCase();
    
    // Inserir novo usuário
    const result = await pool.query(`
      INSERT INTO usuarios (nome, email, senha_hash, role, avatar, ativo)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nome, email, role, avatar
    `, [nome, email, hashedPassword, 'user', avatar, true]);
    
    const newUser = result.rows[0];
    
    // Gerar token
    const token = jwt.sign(
      {
        id: newUser.id,
        name: newUser.nome,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar
      },
      process.env.JWT_SECRET || 'assistance-sm-secret-key-2024',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        name: newUser.nome,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar
      }
    });
    
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// ==============================
// ROTAS DE SAÚDE DO SISTEMA
// ==============================
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==============================
// ROTAS DE CURSOS (PÚBLICAS E ADMIN)
// ==============================
// GET: Listar todos os cursos (público)
app.get('/api/cursos', async (req, res) => {
  try {
    const query = `
      SELECT id, nome, descricao, duracao, vagas, investimento, 
             carreira, tags, cor, ativo, created_at
      FROM cursos 
      WHERE ativo = true
      ORDER BY nome
    `;
    
    const result = await pool.query(query);
    
    // Converter tags de string para array se necessário
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

// GET: Buscar curso por ID (público)
app.get('/api/cursos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT id, nome, descricao, duracao, vagas, investimento, 
             carreira, tags, cor, ativo
      FROM cursos 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
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

// POST: Criar novo curso (admin apenas)
app.post('/api/cursos', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    
    const { 
      nome, 
      descricao, 
      duracao, 
      vagas, 
      investimento, 
      carreira, 
      tags, 
      cor, 
      ativo 
    } = req.body;
    
    // Validar dados obrigatórios
    if (!nome || !descricao) {
      return res.status(400).json({ error: 'Nome e descrição são obrigatórios' });
    }
    
    const query = `
      INSERT INTO cursos (
        nome, descricao, duracao, vagas, investimento, 
        carreira, tags, cor, ativo, created_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;
    
    // Converter tags array para string
    const tagsString = Array.isArray(tags) ? tags.join(', ') : tags;
    
    const result = await pool.query(query, [
      nome,
      descricao,
      duracao || 'Não informado',
      vagas || 0,
      investimento || 'Não informado',
      carreira || '',
      tagsString || '',
      cor || '#4361ee',
      ativo !== false
    ]);
    
    const curso = result.rows[0];
    curso.tags = curso.tags ? curso.tags.split(',').map(tag => tag.trim()) : [];
    
    res.status(201).json(curso);
  } catch (error) {
    console.error('Erro ao criar curso:', error);
    res.status(500).json({ error: 'Erro ao criar curso' });
  }
});

// PUT: Atualizar curso (admin apenas)
app.put('/api/cursos/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    
    const { id } = req.params;
    const { 
      nome, 
      descricao, 
      duracao, 
      vagas, 
      investimento, 
      carreira, 
      tags, 
      cor, 
      ativo 
    } = req.body;
    
    // Verificar se curso existe
    const checkQuery = await pool.query('SELECT id FROM cursos WHERE id = $1', [id]);
    if (checkQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    
    const query = `
      UPDATE cursos 
      SET nome = $1, 
          descricao = $2, 
          duracao = $3, 
          vagas = $4, 
          investimento = $5, 
          carreira = $6, 
          tags = $7, 
          cor = $8, 
          ativo = $9,
          updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `;
    
    // Converter tags array para string
    const tagsString = Array.isArray(tags) ? tags.join(', ') : tags;
    
    const result = await pool.query(query, [
      nome,
      descricao,
      duracao || 'Não informado',
      vagas || 0,
      investimento || 'Não informado',
      carreira || '',
      tagsString || '',
      cor || '#4361ee',
      ativo !== false,
      id
    ]);
    
    const curso = result.rows[0];
    curso.tags = curso.tags ? curso.tags.split(',').map(tag => tag.trim()) : [];
    
    res.json(curso);
  } catch (error) {
    console.error('Erro ao atualizar curso:', error);
    res.status(500).json({ error: 'Erro ao atualizar curso' });
  }
});

// DELETE: Excluir curso (admin apenas)
app.delete('/api/cursos/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    
    const { id } = req.params;
    
    // Verificar se curso existe
    const checkQuery = await pool.query('SELECT id FROM cursos WHERE id = $1', [id]);
    if (checkQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    
    const query = 'DELETE FROM cursos WHERE id = $1 RETURNING id, nome';
    const result = await pool.query(query, [id]);
    
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

// ==============================
// ROTAS DE CHAT/INTERAÇÕES
// ==============================
// POST: Salvar interação de chat
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { usuario_id, curso_id, pergunta, resposta } = req.body;
    
    // Se for usuário local (sem ID numérico), não salvar no banco
    if (usuario_id && usuario_id.startsWith('local_')) {
      return res.json({
        success: true,
        message: 'Interação de usuário local registrada',
        local: true
      });
    }
    
    const query = `
      INSERT INTO interacoes_ia (
        usuario_id, curso_id, pergunta, resposta, created_at
      ) 
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      usuario_id,
      curso_id,
      pergunta,
      resposta
    ]);
    
    res.status(201).json({
      success: true,
      interacao: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao salvar interação:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao salvar interação',
      message: error.message 
    });
  }
});

// GET: Histórico de interações do usuário
app.get('/api/chat/historico/:usuario_id', authenticateToken, async (req, res) => {
  try {
    const { usuario_id } = req.params;
    
    // Verificar se o usuário tem permissão
    if (req.user.role !== 'admin' && req.user.id.toString() !== usuario_id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const query = `
      SELECT i.*, c.nome as curso_nome, c.cor as curso_cor
      FROM interacoes_ia i
      LEFT JOIN cursos c ON i.curso_id = c.id
      WHERE i.usuario_id = $1
      ORDER BY i.created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query, [usuario_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// ==============================
// ROTAS DO DASHBOARD ADMIN
// ==============================
// GET: Estatísticas do dashboard
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Executar todas as queries em paralelo
    const [
      usuariosResult,
      cursosResult,
      interacoesResult,
      engajamentoResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM usuarios WHERE ativo = true'),
      pool.query('SELECT COUNT(*) as total FROM cursos WHERE ativo = true'),
      pool.query('SELECT COUNT(*) as total FROM interacoes_ia'),
      pool.query(`
        SELECT 
          COUNT(DISTINCT usuario_id) as usuarios_ativos,
          (SELECT COUNT(*) FROM usuarios WHERE ativo = true) as total_usuarios
        FROM interacoes_ia
      `)
    ]);
    
    const engajamento = engajamentoResult.rows[0];
    const totalUsuarios = parseInt(engajamento.total_usuarios) || 1;
    const usuariosAtivos = parseInt(engajamento.usuarios_ativos) || 0;
    const taxaEngajamento = Math.round((usuariosAtivos / totalUsuarios) * 100);
    
    res.json({
      total_usuarios: parseInt(usuariosResult.rows[0].total),
      total_cursos: parseInt(cursosResult.rows[0].total),
      total_interacoes: parseInt(interacoesResult.rows[0].total),
      usuarios_ativos: usuariosAtivos,
      taxa_engajamento: `${taxaEngajamento}%`
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// GET: Atividades recentes
app.get('/api/dashboard/activities', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const query = `
      SELECT 
        'chat' as type,
        'Interação no Chat' as title,
        u.nome || ' perguntou sobre ' || COALESCE(c.nome, 'um curso') as description,
        i.created_at as timestamp
      FROM interacoes_ia i
      LEFT JOIN usuarios u ON i.usuario_id::text = u.id::text
      LEFT JOIN cursos c ON i.curso_id = c.id
      WHERE i.created_at >= NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT 
        'user' as type,
        'Novo usuário' as title,
        nome || ' se registrou no sistema' as description,
        created_at as timestamp
      FROM usuarios
      WHERE created_at >= NOW() - INTERVAL '7 days'
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json({ error: 'Erro ao buscar atividades' });
  }
});

// ==============================
// ROTAS DE USUÁRIOS
// ==============================
// GET: Listar todos os usuários (admin apenas)
app.get('/api/usuarios', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const query = `
      SELECT id, nome, email, role, ativo, avatar, 
             ultimo_login, created_at
      FROM usuarios
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// POST: Criar novo usuário (admin apenas)
app.post('/api/usuarios', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { nome, email, senha, role, avatar } = req.body;
    
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }
    
    // Verificar se email já existe
    const existingUser = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    const hashedPassword = await bcrypt.hash(senha, 10);
    
    const query = `
      INSERT INTO usuarios (nome, email, senha_hash, role, avatar, ativo)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nome, email, role, avatar, ativo, created_at
    `;
    
    const result = await pool.query(query, [
      nome,
      email,
      hashedPassword,
      role || 'user',
      avatar || nome.charAt(0).toUpperCase(),
      true
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// PUT: Atualizar usuário
app.put('/api/usuarios/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { id } = req.params;
    const { nome, email, role, ativo, avatar } = req.body;
    
    const query = `
      UPDATE usuarios 
      SET nome = $1, 
          email = $2, 
          role = $3, 
          ativo = $4, 
          avatar = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING id, nome, email, role, ativo, avatar, updated_at
    `;
    
    const result = await pool.query(query, [
      nome,
      email,
      role,
      ativo !== false,
      avatar,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// ==============================
// ROTAS PÚBLICAS DE TESTE
// ==============================
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API Assistance SM funcionando!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'Neon PostgreSQL',
    version: '1.0.0'
  });
});

// Rota para verificar status da API
app.get('/api/status', async (req, res) => {
  try {
    const dbStatus = await pool.query('SELECT 1');
    
    res.json({
      status: 'online',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'online',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Rota padrão
app.get('/', (req, res) => {
  res.json({
    name: 'Assistance SM API',
    version: '1.0.0',
    description: 'API para sistema de assistência com IA',
    endpoints: {
      health: '/api/health',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register'
      },
      courses: {
        list: 'GET /api/cursos',
        single: 'GET /api/cursos/:id',
        create: 'POST /api/cursos (admin)',
        update: 'PUT /api/cursos/:id (admin)',
        delete: 'DELETE /api/cursos/:id (admin)'
      },
      chat: {
        save: 'POST /api/chat',
        history: 'GET /api/chat/historico/:usuario_id'
      },
      dashboard: {
        stats: 'GET /api/dashboard/stats (admin)',
        activities: 'GET /api/dashboard/activities (admin)'
      },
      users: {
        list: 'GET /api/usuarios (admin)',
        create: 'POST /api/usuarios (admin)',
        update: 'PUT /api/usuarios/:id (admin)'
      }
    },
    database: 'Neon PostgreSQL',
    status: 'active'
  });
});

// ==============================
// MANIPULAÇÃO DE ERROS
// ==============================
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Rota 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// ==============================
// INICIALIZAÇÃO DO SERVIDOR
// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Servidor Assistance SM rodando na porta ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`💾 Banco: Neon PostgreSQL - ${process.env.DATABASE_URL ? 'Configurado' : 'Usando URL padrão'}`);
});
