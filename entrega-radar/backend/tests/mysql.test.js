// Banco real dedicado: configure DB_NAME=entrega_radar_test e RUN_MYSQL_TESTS=1.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const enabled = process.env.RUN_MYSQL_TESTS === '1';
let pool;
test(
    'MySQL real: esquema, autenticação, isolamento e CRUD de pedidos',
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
            await conferirPedidos(request, app, l.body.token, empresa, userId, d);
        } finally {
            if (userId) await pool.execute('DELETE FROM usuarios WHERE id=?', [userId]);
            if (empresa) await pool.execute('DELETE FROM empresas WHERE id=?', [empresa]);
        }
    }
);

async function conferirPedidos(request, app, token, empresa, usuario, cadastro) {
    const credenciais = { ...cadastro, email: 'outra-' + cadastro.email };
    let outroUsuario;
    let outraEmpresa;
    const autorizar = (req, jwt = token) => req.set('Authorization', 'Bearer ' + jwt);
    const dados = {
        material: 'Chapa de aço',
        fornecedor: 'Fornecedor de teste',
        origem: 'Porto Alegre',
        destino: 'Santa Cruz do Sul',
        quantidade: '2.125',
        unidade: 'kg',
        prazo_combinado: '2000-01-01'
    };

    try {
        const outro = await request(app).post('/api/auth/cadastro').send(credenciais).expect(201);
        outroUsuario = outro.body.usuario.id;
        const [[vinculo]] = await pool.execute('SELECT empresa_id FROM usuarios WHERE id = ?', [
            outroUsuario
        ]);
        outraEmpresa = vinculo.empresa_id;
        const login = await request(app).post('/api/auth/login').send(credenciais).expect(200);
        const outroToken = login.body.token;
        const criado = await autorizar(request(app).post('/api/pedidos')).send(dados).expect(201);
        const id = criado.body.id;
        const rota = '/api/pedidos/' + id;
        assert.equal(criado.headers.location, rota);
        const consulta = await autorizar(request(app).get(rota)).expect(200);
        assert.equal(consulta.body.pedido.quantidade, '2.125');
        assert.equal(consulta.body.pedido.prazo_combinado, '2000-01-01');
        assert.equal(consulta.body.pedido.prazo_vencido, 1);
        assert.equal(consulta.body.pedido.etapa, 'aguardando_confirmacao');

        const listaExterna = await autorizar(request(app).get('/api/pedidos'), outroToken).expect(
            200
        );
        assert.deepEqual(listaExterna.body.pedidos, []);
        await autorizar(request(app).get(rota), outroToken).expect(404);
        await autorizar(request(app).put(rota), outroToken).send(dados).expect(404);
        await autorizar(request(app).delete(rota), outroToken).expect(404);

        await autorizar(request(app).put(rota))
            .send({ ...dados, material: 'Chapa galvanizada', prazo_combinado: '2099-01-01' })
            .expect(204);
        const lista = await autorizar(request(app).get('/api/pedidos')).expect(200);
        assert.equal(lista.body.pedidos.length, 1);
        assert.equal(lista.body.pedidos[0].material, 'Chapa galvanizada');
        assert.equal(lista.body.pedidos[0].prazo_vencido, 0);

        await pool.execute(
            "INSERT INTO atualizacoes_entrega (pedido_id, usuario_id, etapa, ocorrido_em) VALUES (?, ?, 'aguardando_confirmacao', NOW())",
            [id, usuario]
        );
        await autorizar(request(app).delete(rota)).expect(409);
        await pool.execute('DELETE FROM atualizacoes_entrega WHERE pedido_id = ?', [id]);
        await pool.execute("UPDATE pedidos SET etapa = 'confirmado' WHERE id = ?", [id]);
        await autorizar(request(app).put(rota)).send(dados).expect(409);
        await autorizar(request(app).delete(rota)).expect(409);
        await pool.execute("UPDATE pedidos SET etapa = 'aguardando_confirmacao' WHERE id = ?", [
            id
        ]);
        await autorizar(request(app).delete(rota)).expect(204);
        await autorizar(request(app).get(rota)).expect(404);
    } finally {
        await pool.execute(
            'DELETE a FROM atualizacoes_entrega a JOIN pedidos p ON a.pedido_id = p.id WHERE p.empresa_id = ?',
            [empresa]
        );
        await pool.execute('DELETE FROM pedidos WHERE empresa_id = ?', [empresa]);
        if (outroUsuario) await pool.execute('DELETE FROM usuarios WHERE id = ?', [outroUsuario]);
        if (outraEmpresa) await pool.execute('DELETE FROM empresas WHERE id = ?', [outraEmpresa]);
    }
}

after(async () => {
    if (pool) await pool.end();
});
