// Contratos HTTP com banco simulado; não substituem a suíte MySQL.
process.env.JWT_SECRET = require('node:crypto').randomBytes(48).toString('hex');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../database/conexao');
const config = require('../config');
const { hashSenha, verificarSenha } = require('../services/senhas');
const users = [];
const orgs = [];
let rollback = 0;
const execute = async (sql, values) => {
    if (sql.startsWith('INSERT INTO empresas') || sql.startsWith('INSERT INTO transportadoras')) {
        orgs.push(values[0]);
        return [{ insertId: orgs.length }];
    }
    if (sql.startsWith('INSERT INTO usuarios')) {
        if (users.some((u) => u.email === values[1]))
            throw Object.assign(new Error('private SQL'), { code: 'ER_DUP_ENTRY' });
        const [nome, email, senha_hash, perfil, empresa_id, transportadora_id] = values;
        const u = {
            id: users.length + 1,
            nome,
            email,
            senha_hash,
            perfil,
            empresa_id,
            transportadora_id,
            ativo: 1
        };
        users.push(u);
        return [{ insertId: u.id }];
    }
    if (sql.includes('WHERE email = ?')) return [users.filter((u) => u.email === values[0])];
    if (sql.includes('WHERE id = ?'))
        return [
            users
                .filter((u) => String(u.id) === values[0] && u.ativo)
                .map(({ senha_hash, ativo, ...u }) => u)
        ];
    throw new Error('SQL inesperado');
};
pool.execute = execute;
pool.getConnection = async () => ({
    execute,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {
        rollback++;
        orgs.pop();
    },
    release() {}
});
const app = require('../app');
const d = {
    nome: 'Pessoa Teste',
    email: 'pessoa@example.test',
    senha: 'Senha longa de teste 123',
    perfil: 'contratante',
    organizacao: 'Empresa Teste'
};
let token;
test('cadastro, hash, duplicidade, credenciais e isolamento', async () => {
    await request(app)
        .post('/api/auth/cadastro')
        .send({ ...d, perfil: 'administrador' })
        .expect(400);
    for (const extra of [{ empresa_id: 1 }, { transportadora_id: 1 }, { papel: 'administrador' }])
        await request(app)
            .post('/api/auth/cadastro')
            .send({ ...d, ...extra })
            .expect(400);
    for (const extra of [
        { email: 'ruim' },
        { senha: 'curta' },
        { nome: '' },
        { organizacao: '' },
        { perfil: 'x' }
    ])
        await request(app)
            .post('/api/auth/cadastro')
            .send({ ...d, ...extra })
            .expect(400);
    const c = await request(app).post('/api/auth/cadastro').send(d).expect(201);
    assert.equal(c.body.usuario.senha_hash, undefined);
    assert.notEqual(users[0].senha_hash, d.senha);
    assert(await verificarSenha(d.senha, users[0].senha_hash));
    await request(app)
        .post('/api/auth/cadastro')
        .send({ ...d, email: d.email.toUpperCase() })
        .expect(409);
    assert.equal(rollback, 1);
    await request(app)
        .post('/api/auth/cadastro')
        .send({ ...d, email: 'trans@example.test', perfil: 'transportadora' })
        .expect(201);
    await request(app)
        .post('/api/auth/login')
        .send({ email: d.email, senha: 'incorreta longa 123' })
        .expect(401);
    await request(app)
        .post('/api/auth/login')
        .send({ email: 'ausente@example.test', senha: d.senha })
        .expect(401);
    const login = await request(app).post('/api/auth/login').send(d).expect(200);
    token = login.body.token;
    const me = await request(app)
        .get('/api/usuarios/me?empresa_id=999')
        .set('Authorization', 'Bearer ' + token)
        .expect(200);
    assert.equal(me.body.usuario.empresa_id, 1);
    assert(!JSON.stringify(me.body).includes('senha'));
    await request(app)
        .get('/api/admin/painel')
        .set('Authorization', 'Bearer ' + token)
        .expect(403);
    const t = await request(app)
        .post('/api/auth/login')
        .send({ email: 'trans@example.test', senha: d.senha })
        .expect(200);
    await request(app)
        .get('/api/admin/painel')
        .set('Authorization', 'Bearer ' + t.body.token)
        .expect(403);
});
test('JWT ausente, adulterado, expirado, sem exp, issuer errado e usuário inativo', async () => {
    await request(app).get('/api/usuarios/me').expect(401);
    await request(app)
        .get('/api/usuarios/me')
        .set('Authorization', 'Bearer ' + token + 'x')
        .expect(401);
    for (const opts of [{ expiresIn: -1 }, {}, { issuer: 'errado', expiresIn: 60 }]) {
        const t = jwt.sign({}, config.secret, {
            subject: '1',
            audience: config.audience,
            issuer: config.issuer,
            ...opts
        });
        await request(app)
            .get('/api/usuarios/me')
            .set('Authorization', 'Bearer ' + t)
            .expect(401);
    }
    users[0].ativo = 0;
    await request(app)
        .get('/api/usuarios/me')
        .set('Authorization', 'Bearer ' + token)
        .expect(401);
    users[0].ativo = 1;
    users.push({
        id: 99,
        nome: 'Admin',
        email: 'admin@example.test',
        perfil: 'administrador',
        empresa_id: null,
        transportadora_id: null,
        ativo: 1
    });
    const a = jwt.sign({}, config.secret, {
        subject: '99',
        issuer: config.issuer,
        audience: config.audience,
        expiresIn: 60
    });
    await request(app)
        .get('/api/admin/painel')
        .set('Authorization', 'Bearer ' + a)
        .expect(200);
});
test('hash com salt aleatório e erros/arquivos estáticos', async () => {
    assert.notEqual(await hashSenha(d.senha), await hashSenha(d.senha));
    assert.equal(await verificarSenha('outra senha', users[0].senha_hash), false);
    await request(app)
        .get('/')
        .expect(200)
        .expect(/form id="login"/);
    await request(app)
        .get('/js/script.js')
        .expect(200)
        .expect(/fetch\(/);
    await request(app).get('/.env').expect(404);
    await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{')
        .expect(400);
    const orig = pool.execute;
    pool.execute = async () => {
        throw new Error('credenciais privadas');
    };
    const e = await request(app)
        .get('/api/usuarios/me')
        .set('Authorization', 'Bearer ' + token)
        .expect(500);
    assert(!JSON.stringify(e.body).includes('privadas'));
    pool.execute = orig;
});
test('DOM + Fetch: cadastro, login, conta, permissão e saída com API real e banco simulado', async () => {
    const { JSDOM } = require('jsdom');
    const server = app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    const base = 'http://127.0.0.1:' + server.address().port;
    let dom;
    try {
        dom = await JSDOM.fromURL(base, {
            resources: 'usable',
            runScripts: 'dangerously',
            beforeParse(window) {
                window.fetch = (url, options) => fetch(new URL(url, base), options);
            }
        });
        await new Promise((resolve) => dom.window.addEventListener('load', resolve));
        const doc = dom.window.document;
        const el = (id) => doc.getElementById(id);
        const wait = async (fn) => {
            for (let i = 0; i < 100; i++) {
                if (fn()) return;
                await new Promise((r) => setTimeout(r, 30));
            }
            throw new Error('Timeout DOM');
        };
        el('abrir-cadastro').click();
        assert.equal(el('cadastro').hidden, false);
        for (const [id, value] of Object.entries({
            nome: 'Pessoa DOM',
            organizacao: 'Empresa DOM',
            'cadastro-email': 'dom@example.test',
            'cadastro-senha': d.senha,
            confirmar: d.senha
        }))
            el(id).value = value;
        el('cadastro').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
        await wait(() => el('mensagem').textContent.includes('Cadastro concluído'));
        el('login-senha').value = d.senha;
        el('login').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
        await wait(() => !el('conta').hidden);
        assert(el('dados').textContent.includes('dom@example.test'));
        assert.equal(el('admin').hidden, true);
        assert.equal(dom.window.localStorage.length, 0);
        el('sair').click();
        assert.equal(el('login').hidden, false);
        assert.equal(el('dados').textContent, '');
    } finally {
        if (dom) dom.window.close();
        await new Promise((r) => server.close(r));
    }
});
after(() => pool.end());
