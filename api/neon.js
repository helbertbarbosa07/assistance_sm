// api/neon.js - CONEXÃO DIRETA COM SEU NEON DATABASE
import { Pool } from 'pg';

// Configuração da conexão com seu Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // máximo de conexões
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Testar conexão
async function testConnection() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as time');
        client.release();
        return { connected: true, time: result.rows[0].time };
    } catch (error) {
        console.error('❌ Erro conexão Neon:', error.message);
        return { connected: false, error: error.message };
    }
}

// Handler principal
export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Só aceita POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { action, data } = req.body;
        console.log(`🔵 API Action: ${action}`, data ? '(com dados)' : '');

        let client;
        let result;

        switch (action) {
            case 'test':
                const connection = await testConnection();
                return res.status(200).json({
                    success: true,
                    data: {
                        message: 'API Neon conectada',
                        database: connection.connected ? 'ONLINE' : 'OFFLINE',
                        time: connection.time,
                        env: process.env.NODE_ENV
                    }
                });

            case 'get_produtos':
                client = await pool.connect();
                try {
                    const query = `
                        SELECT 
                            p.*,
                            COALESCE(
                                (SELECT SUM(vi.quantidade) 
                                 FROM venda_itens vi 
                                 WHERE vi.produto_id = p.id), 
                                0
                            ) as total_vendido
                        FROM produtos p
                        ORDER BY p.nome
                    `;
                    result = await client.query(query);
                    return res.status(200).json({
                        success: true,
                        data: result.rows
                    });
                } finally {
                    client.release();
                }

            case 'create_produto':
                client = await pool.connect();
                try {
                    const query = `
                        INSERT INTO produtos (
                            nome, descricao, preco, estoque, 
                            emoji, cor, ativo, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                        RETURNING *
                    `;
                    const values = [
                        data.nome,
                        data.descricao || '',
                        data.preco,
                        data.estoque,
                        data.emoji || '🍦',
                        data.cor || '#36B5B0',
                        data.ativo !== false
                    ];
                    result = await client.query(query, values);
                    return res.status(200).json({
                        success: true,
                        data: result.rows[0]
                    });
                } finally {
                    client.release();
                }

            case 'update_produto':
                client = await pool.connect();
                try {
                    const query = `
                        UPDATE produtos 
                        SET nome = $1,
                            descricao = $2,
                            preco = $3,
                            estoque = $4,
                            emoji = $5,
                            cor = $6,
                            ativo = $7,
                            updated_at = NOW()
                        WHERE id = $8
                        RETURNING *
                    `;
                    const values = [
                        data.nome,
                        data.descricao || '',
                        data.preco,
                        data.estoque,
                        data.emoji || '🍦',
                        data.cor || '#36B5B0',
                        data.ativo !== false,
                        data.id
                    ];
                    result = await client.query(query, values);
                    return res.status(200).json({
                        success: true,
                        data: result.rows[0]
                    });
                } finally {
                    client.release();
                }

            case 'delete_produto':
                client = await pool.connect();
                try {
                    await client.query('DELETE FROM produtos WHERE id = $1', [data.id]);
                    return res.status(200).json({
                        success: true,
                        data: { message: 'Produto excluído' }
                    });
                } finally {
                    client.release();
                }

            case 'create_venda':
                client = await pool.connect();
                try {
                    // Iniciar transação
                    await client.query('BEGIN');

                    // Criar venda
                    const vendaQuery = `
                        INSERT INTO vendas (
                            data, hora, total, total_itens, 
                            pagamento, status, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                        RETURNING id
                    `;
                    const vendaValues = [
                        data.data || new Date().toISOString().split('T')[0],
                        data.hora || new Date().toLocaleTimeString('pt-BR'),
                        data.total,
                        data.total_itens || 0,
                        data.pagamento || 'dinheiro',
                        'concluida'
                    ];
                    const vendaResult = await client.query(vendaQuery, vendaValues);
                    const vendaId = vendaResult.rows[0].id;

                    // Inserir itens e atualizar estoque
                    if (data.itens && Array.isArray(data.itens)) {
                        for (const item of data.itens) {
                            // Inserir item
                            await client.query(
                                `INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco) 
                                 VALUES ($1, $2, $3, $4)`,
                                [vendaId, item.produto_id, item.quantidade, item.preco]
                            );

                            // Atualizar estoque
                            await client.query(
                                `UPDATE produtos SET estoque = estoque - $1 WHERE id = $2`,
                                [item.quantidade, item.produto_id]
                            );
                        }
                    }

                    // Commit
                    await client.query('COMMIT');

                    return res.status(200).json({
                        success: true,
                        data: { vendaId }
                    });
                } catch (error) {
                    // Rollback em caso de erro
                    await client.query('ROLLBACK');
                    throw error;
                } finally {
                    client.release();
                }

            case 'get_vendas_recentes':
                client = await pool.connect();
                try {
                    const query = `
                        SELECT 
                            v.*,
                            COUNT(vi.id) as total_itens
                        FROM vendas v
                        LEFT JOIN venda_itens vi ON v.id = vi.venda_id
                        WHERE v.data = CURRENT_DATE
                        GROUP BY v.id
                        ORDER BY v.hora DESC
                        LIMIT 10
                    `;
                    result = await client.query(query);
                    return res.status(200).json({
                        success: true,
                        data: result.rows
                    });
                } finally {
                    client.release();
                }

            case 'get_dashboard_stats':
                client = await pool.connect();
                try {
                    // Faturamento hoje
                    const faturamentoResult = await client.query(
                        'SELECT COALESCE(SUM(total), 0) as total FROM vendas WHERE data = CURRENT_DATE'
                    );
                    
                    // Total itens vendidos hoje
                    const itensResult = await client.query(`
                        SELECT COALESCE(SUM(vi.quantidade), 0) as total
                        FROM vendas v
                        JOIN venda_itens vi ON v.id = vi.venda_id
                        WHERE v.data = CURRENT_DATE
                    `);
                    
                    // Total vendas hoje
                    const vendasResult = await client.query(
                        'SELECT COUNT(*) as total FROM vendas WHERE data = CURRENT_DATE'
                    );
                    
                    // Estoque baixo
                    const estoqueResult = await client.query(
                        'SELECT COUNT(*) as total FROM produtos WHERE estoque <= 10 AND estoque > 0 AND ativo = true'
                    );
                    
                    // Produtos mais vendidos hoje
                    const produtosResult = await client.query(`
                        SELECT 
                            p.id, p.nome,
                            COALESCE(SUM(vi.quantidade), 0) as vendas_hoje
                        FROM produtos p
                        LEFT JOIN venda_itens vi ON p.id = vi.produto_id
                        LEFT JOIN vendas v ON vi.venda_id = v.id AND v.data = CURRENT_DATE
                        WHERE p.ativo = true
                        GROUP BY p.id, p.nome
                        ORDER BY vendas_hoje DESC
                        LIMIT 5
                    `);

                    return res.status(200).json({
                        success: true,
                        data: {
                            faturamentoHoje: parseFloat(faturamentoResult.rows[0]?.total || 0),
                            totalItens: parseInt(itensResult.rows[0]?.total || 0),
                            totalVendas: parseInt(vendasResult.rows[0]?.total || 0),
                            estoqueBaixo: parseInt(estoqueResult.rows[0]?.total || 0),
                            produtosMaisVendidos: produtosResult.rows
                        }
                    });
                } finally {
                    client.release();
                }

            case 'get_fiados':
                client = await pool.connect();
                try {
                    const query = 'SELECT * FROM fiados ORDER BY created_at DESC';
                    result = await client.query(query);
                    return res.status(200).json({
                        success: true,
                        data: result.rows
                    });
                } finally {
                    client.release();
                }

            default:
                return res.status(400).json({
                    success: false,
                    error: `Ação não suportada: ${action}`
                });
        }

    } catch (error) {
        console.error('❌ Erro API:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
