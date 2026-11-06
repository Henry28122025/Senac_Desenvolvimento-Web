// Banco real dedicado: configure DB_NAME=entrega_radar_test e RUN_MYSQL_TESTS=1.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const enabled = process.env.RUN_MYSQL_TESTS === '1';
let pool;
test(
    'MySQL real: schema, FKs, cadastro, hash, duplicidade, rollback e login',
    { skip: !enabled },
    async () => {
        assert.equal(process.env.DB_NAME, 'entrega_radar_test', 'Use banco exclusivo de testes');
        const mysql = require('mysql2/promise');
        const fs = require('node:fs');
        const path = require('node:path');
        const setup = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });
        try {
            await setup.query(
                fs
                    .readFileSync(path.join(__dirname, '../../sql/entrega_radar.sql'), 'utf8')
                    .replaceAll('entrega_radar', 'entrega_radar_test')
            );
        } finally {
            await setup.end();
        }
        pool = require('../database/conexao');
        const request = require('supertest');
        const app = require('../app');
        const suffix = require('node:crypto').randomUUID();
        const email = suffix + '@example.test';
        const d = {
            nome: 'Teste real',
            email,
            senha: 'senha de teste real 123',
            perfil: 'contratante',
            organizacao: suffix
        };
        let userId, empresa;
        try {
            const c = await request(app).post('/api/auth/cadastro').send(d).expect(201);
            userId = c.body.usuario.id;
            const [[u]] = await pool.execute('SELECT * FROM usuarios WHERE id=?', [userId]);
            empresa = u.empresa_id;
            assert.notEqual(u.senha_hash, d.senha);
            assert(await require('../services/senhas').verificarSenha(d.senha, u.senha_hash));
            await request(app).post('/api/auth/cadastro').send(d).expect(409);
            const [[count]] = await pool.execute(
                'SELECT COUNT(*) AS n FROM empresas WHERE nome=?',
                [suffix]
            );
            assert.equal(count.n, 1);
            await assert.rejects(
                pool.execute(
                    "INSERT INTO usuarios(nome,email,senha_hash,perfil,empresa_id) VALUES ('x',?,'hash','contratante',4294967295)",
                    [suffix + 'bad@example.test']
                )
            );
            const l = await request(app).post('/api/auth/login').send(d).expect(200);
            await request(app)
                .get('/api/usuarios/me')
                .set('Authorization', 'Bearer ' + l.body.token)
                .expect(200);
        } finally {
            if (userId) await pool.execute('DELETE FROM usuarios WHERE id=?', [userId]);
            if (empresa) await pool.execute('DELETE FROM empresas WHERE id=?', [empresa]);
        }
    }
);
after(async () => {
    if (pool) await pool.end();
});
