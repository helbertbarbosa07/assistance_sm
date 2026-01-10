
import { Pool } from 'pg';

/* ===============================
   CONEXÃO COM O NEON
================================ */

let pool;

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });
    }
    return pool;
}

/* ===============================
   HANDLER PRINCIPAL
================================ */

export default async function handler(req, res) {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    try {
        const pool = getPool();

        /* ===============================
           HEALTH CHECK
        ================================ */
        if (pathname.endsWith('/health')) {
            await pool.query('SELECT 1');
            return res.status(200).json({
                status: 'ok',
                database: 'connected'
            });
        }

        /* ===============================
           LISTAR USUÁRIOS
        ================================ */
        if (pathname.endsWith('/users')) {
            if (req.method !== 'GET') {
                return res.status(405).json({ error: 'Método não permitido' });
            }

            const { rows } = await pool.query(`
                SELECT id, username, nome, email, role, status, created_at
                FROM users
                ORDER BY id
            `);

            return res.status(200).json(rows);
        }

        /* ===============================
           LISTAR CURSOS
        ================================ */
        if (pathname.endsWith('/courses')) {
            if (req.method !== 'GET') {
                return res.status(405).json({ error: 'Método não permitido' });
            }

            const { rows } = await pool.query(`
                SELECT id, name, slug, duration, price, status
                FROM courses
                WHERE status = 'active'
                ORDER BY name
            `);

            return res.status(200).json(rows);
        }

        /* ===============================
           ROTA NÃO ENCONTRADA
        ================================ */
        return res.status(404).json({ error: 'Rota não encontrada' });

    } catch (error) {
        console.error('Erro API Neon:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
