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
const pedidos = [];
const camposPedido = [
    'material',
    'fornecedor',
    'origem',
    'destino',
    'quantidade',
    'unidade',
    'prazo_combinado'
];

function dadosPedido(values) {
    return Object.fromEntries(camposPedido.map((campo, i) => [campo, values[i]]));
}
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
    if (sql.startsWith('INSERT INTO pedidos')) {
        const id = pedidos.length + 1;
        pedidos.push({
            id,
            empresa_id: values[0],
            etapa: 'aguardando_confirmacao',
            ...dadosPedido(values.slice(1))
        });
        return [{ insertId: id }];
    }
    if (sql.startsWith('SELECT') && sql.includes('FROM pedidos WHERE')) {
        assert.match(sql, /empresa_id = \?/);
        return [
            pedidos.filter((pedido) =>
                values.length === 1
                    ? pedido.empresa_id === values[0]
                    : pedido.id === values[0] && pedido.empresa_id === values[1]
            )
        ];
    }
    if (sql.startsWith('UPDATE pedidos') || sql.startsWith('DELETE FROM pedidos')) {
        assert.match(sql, /WHERE id = \? AND empresa_id = \?/);
        const [id, empresa] = values.slice(-2);
        const i = pedidos.findIndex((pedido) => pedido.id === id && pedido.empresa_id === empresa);
        assert.notEqual(i, -1);
        if (sql.startsWith('UPDATE')) Object.assign(pedidos[i], dadosPedido(values));
        else pedidos.splice(i, 1);
        return [{ affectedRows: 1 }];
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
pool.getConnection = async () => {
    const quantidadeOrganizacoes = orgs.length;
    const quantidadeUsuarios = users.length;
    return {
        execute,
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {
            rollback++;
            orgs.length = quantidadeOrganizacoes;
            users.length = quantidadeUsuarios;
        },
        release() {}
    };
};
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
test('API de pedidos aplica autenticação, perfil, empresa, validações e etapa', async () => {
    const auth = (id) =>
        'Bearer ' +
        jwt.sign({}, config.secret, {
            subject: String(id),
            audience: config.audience,
            issuer: config.issuer,
            expiresIn: 60
        });
    users.push({ id: 101, ativo: 1, perfil: 'contratante', empresa_id: 101 });
    const dados = {
        material: 'Aço',
        fornecedor: 'Fornecedor',
        origem: 'Porto Alegre',
        destino: 'Santa Cruz do Sul',
        quantidade: '2.500',
        unidade: 'kg',
        prazo_combinado: '2026-11-20'
    };
    const rota = '/api/pedidos';
    await request(app).get(rota).expect(401);
    for (const id of [2, 99])
        await request(app).get(rota).set('Authorization', auth(id)).expect(403);
    for (const invalido of [
        { empresa_id: 101 },
        { quantidade: '1.0001' },
        { prazo_combinado: '2026-02-30' },
        { quantidade: 0 },
        { etapa: 'entregue' }
    ])
        await request(app)
            .post(rota)
            .set('Authorization', auth(1))
            .send({ ...dados, ...invalido })
            .expect(400);
    const criado = await request(app)
        .post(rota)
        .set('Authorization', auth(1))
        .send(dados)
        .expect(201);
    const url = rota + '/' + criado.body.id;
    assert.equal(criado.headers.location, url);
    const lista = await request(app).get(rota).set('Authorization', auth(101)).expect(200);
    assert.deepEqual(lista.body.pedidos, []);
    await request(app).get(url).set('Authorization', auth(101)).expect(404);
    await request(app).put(url).set('Authorization', auth(101)).send(dados).expect(404);
    await request(app).delete(url).set('Authorization', auth(101)).expect(404);
    pedidos[0].etapa = 'em_transporte';
    await request(app).put(url).set('Authorization', auth(1)).send(dados).expect(409);
    await request(app).delete(url).set('Authorization', auth(1)).expect(409);
    pedidos[0].etapa = 'aguardando_confirmacao';
    await request(app).delete(url).set('Authorization', auth(1)).expect(204);
});

test('DOM + Fetch: cadastro, login, CRUD de pedidos e saída com API real e banco simulado', async () => {
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
        await wait(() => el('pedidos-status').textContent === 'Nenhum pedido cadastrado.');
        el('novo-pedido').click();
        const form = el('pedido-form');
        for (const [campo, valor] of Object.entries({
            material: 'Tubo',
            fornecedor: 'Fornecedor',
            origem: 'Porto Alegre',
            destino: 'Santa Cruz do Sul',
            quantidade: '4',
            unidade: 'un',
            prazo_combinado: '2026-11-23'
        }))
            form.elements.namedItem(campo).value = valor;
        const salvar = () =>
            form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
        salvar();
        await wait(() => el('pedidos-lista').textContent.includes('Tubo'));
        el('pedidos-lista').querySelector('button').click();
        await wait(() => !form.hidden && form.elements.namedItem('material').value === 'Tubo');
        form.elements.namedItem('material').value = 'Tubo galvanizado';
        salvar();
        await wait(() => el('pedidos-lista').textContent.includes('Tubo galvanizado'));
        dom.window.confirm = () => true;
        const excluir = [...el('pedidos-lista').querySelectorAll('button')].find(
            (button) => button.textContent === 'Excluir'
        );
        excluir.click();
        await wait(() => el('pedidos-status').textContent === 'Pedido excluído.');
        assert.equal(el('pedidos-lista').children.length, 0);
        el('sair').click();
        assert.equal(el('login').hidden, false);
        assert.equal(el('dados').textContent, '');
    } finally {
        if (dom) dom.window.close();
        await new Promise((r) => server.close(r));
    }
});
after(() => pool.end());
