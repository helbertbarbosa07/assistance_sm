// api/index.js - ATUALIZADO COM CONEXÃO NEON - CORRIGIDO

// ... (código anterior permanece igual até a rota de login) ...

// ==============================
// ROTAS DE AUTENTICAÇÃO - CORRIGIDAS
// ==============================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;
    
    console.log('Tentativa de login:', { username, isAdmin: isAdmin || false });
    
    // Se for login de usuário sem senha (visitante)
    if (!isAdmin && (!username || username === 'Visitante' || username === 'visitante' || username.trim() === '')) {
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
      
      console.log('Login de usuário local:', user.name);
      
      return res.json({
        success: true,
        token,
        user
      });
    }
    
    // Se for admin com credenciais padrão (fallback)
    if (isAdmin && username === 'admin' && password === 'admin123') {
      const adminUser = {
        id: 'admin_default',
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
      
      console.log('Login admin padrão');
      
      return res.json({
        success: true,
        token,
        user: adminUser
      });
    }
    
    // Buscar usuário no banco de dados (apenas para usuários registrados)
    const query = `
      SELECT id, nome, email, senha_hash, role, ativo, avatar
      FROM usuarios 
      WHERE LOWER(nome) = LOWER($1) OR LOWER(email) = LOWER($1)
    `;
    
    const result = await pool.query(query, [username]);
    
    if (result.rows.length === 0) {
      console.log('Usuário não encontrado:', username);
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
    
    console.log('Login bem-sucedido:', user.email);
    
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

// ... (restante do código permanece igual) ...
