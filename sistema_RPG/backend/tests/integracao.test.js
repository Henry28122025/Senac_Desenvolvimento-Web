import { test } from "node:test";
import assert from "node:assert/strict";
import { criarAmbienteTeste } from "./ambienteTeste.js";

let ambiente;
const cookies = {};

async function api(rota, { method = "GET", body, conta = "a", origin } = {}) {
  const headers = {};
  if (cookies[conta]) headers.Cookie = cookies[conta];
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (origin) headers.Origin = origin;
  const resposta = await fetch(`${ambiente.url}/api${rota}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const cookie = resposta.headers.get("set-cookie");
  if (cookie) cookies[conta] = cookie.split(";")[0];
  return { status: resposta.status, dados: await resposta.json(), cookie };
}

const produto = (nome = "Dados de teste", estoque = 5) => ({ nome, descricao: "Um produto fictício usado somente nos testes.", categoria: "Dados", preco: 19.95, estoque });
const evento = (vagas = 1) => ({ titulo: "Aventura de teste", descricao: "Uma aventura fictícia para testar as inscrições.", categoria: "RPG", data_evento: "2099-11-14T18:00", local: "Mesa de teste", vagas });

test("Integração com MySQL em banco isolado", async (t) => {
ambiente = await criarAmbienteTeste();
try {
await t.test("API conecta ao MySQL, entrega o frontend e impede escrita de visitantes", async () => {
  assert.equal((await api("/saude")).dados.banco, "conectado");
  const pagina = await fetch(ambiente.url);
  assert.equal(pagina.status, 200);
  assert.match(await pagina.text(), /Conectando/);
  assert.equal((await api("/produtos", { method: "POST", body: produto() })).status, 401);
  assert.equal((await api("/produtos", { method: "POST", body: produto(), origin: "http://localhost:5501" })).status, 401);
  const preflight = await fetch(`${ambiente.url}/api/produtos`, { method: "OPTIONS", headers: { Origin: "http://localhost:5501", "Access-Control-Request-Method": "POST" } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "http://localhost:5501");
  assert.equal((await api("/produtos", { method: "POST", body: produto(), origin: "https://origem-desconhecida.test" })).status, 403);
});

await t.test("cadastro protege senhas, login rejeita credencial errada e sessão usa cookie HttpOnly", async () => {
  const cadastro = await api("/auth/cadastro", { method: "POST", body: { nome: "Aventureira A", email: "a@teste.local", senha: "SenhaTeste123!" } });
  assert.equal(cadastro.status, 201);
  assert.equal(cadastro.dados.usuario.papel, "membro");
  assert.match(cadastro.cookie, /HttpOnly/);
  assert.match(cadastro.cookie, /SameSite=Lax/);
  assert.equal(cadastro.dados.usuario.senha_hash, undefined);
  const [[usuario]] = await ambiente.pool.query("SELECT * FROM usuarios WHERE email = ?", ["a@teste.local"]);
  assert.notEqual(usuario.senha_hash, "SenhaTeste123!");
  assert.match(usuario.senha_hash, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
  assert.equal((await api("/auth/cadastro", { method: "POST", body: { nome: "Duplicado", email: "a@teste.local", senha: "SenhaTeste123!" } })).status, 409);
  assert.equal((await api("/auth/login", { method: "POST", conta: "guest", body: { email: "a@teste.local", senha: "SenhaErrada123" } })).status, 401);
  assert.equal((await api("/auth/login", { method: "POST", body: { email: "a@teste.local", senha: "SenhaTeste123!" } })).status, 200);
  assert.equal((await api("/auth/me")).dados.usuario.nome, "Aventureira A");
  const segundo = await api("/auth/cadastro", { method: "POST", conta: "b", body: { nome: "Aventureiro B", email: "b@teste.local", senha: "SenhaTeste123!", papel: "admin" } });
  assert.equal(segundo.status, 201);
  assert.equal(segundo.dados.usuario.papel, "membro");
});

await t.test("gestão exige administrador, inclusive em requisições feitas fora da interface", async () => {
  for (const recurso of ["produtos", "eventos"]) {
    const body = recurso === "produtos" ? produto() : evento();
    assert.equal((await api(`/${recurso}`, { method: "POST", conta: "b", body })).status, 403);
    assert.equal((await api(`/${recurso}/1`, { method: "PUT", conta: "b", body })).status, 403);
    assert.equal((await api(`/${recurso}/1`, { method: "DELETE", conta: "b" })).status, 403);
  }
  assert.equal((await api("/auth/perfil", { conta: "guest" })).status, 401);
  await ambiente.pool.query("UPDATE usuarios SET papel = 'admin' WHERE email = ?", ["a@teste.local"]);
  assert.equal((await api("/auth/me")).dados.usuario.papel, "admin");
  assert.equal((await api("/auth/me", { conta: "b" })).dados.usuario.papel, "membro");
});

await t.test("publicações executam CREATE, READ, UPDATE, DELETE e preservam autoria", async () => {
  const body = { conteudo: 'Minha aventura <script>alert("x")</script>', categoria: "Conversa", autor: "Autor forjado" };
  const criada = await api("/publicacoes", { method: "POST", body });
  assert.equal(criada.status, 201);
  const id = criada.dados.id;
  const consulta = await api(`/publicacoes/${id}`);
  assert.equal(consulta.dados.conteudo, body.conteudo);
  assert.equal(consulta.dados.autor, "Aventureira A");
  assert.equal((await api(`/publicacoes/${id}`, { method: "PUT", conta: "b", body })).status, 403);
  assert.equal((await api(`/publicacoes/${id}`, { method: "DELETE", conta: "b" })).status, 403);
  assert.equal((await api(`/publicacoes/${id}`, { method: "PUT", body: { ...body, conteudo: "Uma história atualizada." } })).status, 200);
  const [[gravada]] = await ambiente.pool.query("SELECT conteudo FROM publicacoes WHERE id = ?", [id]);
  assert.equal(gravada.conteudo, "Uma história atualizada.");
  assert.equal((await api(`/publicacoes/${id}`, { method: "DELETE" })).status, 200);
  assert.equal((await api(`/publicacoes/${id}`)).status, 404);
  assert.equal((await api("/publicacoes", { method: "POST", body: { conteudo: "", categoria: "Conversa" } })).status, 400);
});

await t.test("produtos executam CRUD e rejeitam preço, estoque e ID inválidos", async () => {
  const criado = await api("/produtos", { method: "POST", body: produto() });
  assert.equal(criado.status, 201);
  const id = criado.dados.id;
  assert.equal((await api(`/produtos/${id}`)).dados.preco, 19.95);
  assert.equal((await api(`/produtos/${id}`, { method: "PUT", body: { ...produto(), estoque: 0, preco: 29.9 } })).status, 200);
  assert.equal((await api(`/produtos/${id}`)).dados.estoque, 0);
  // Salvar sem alterações continua reconhecendo o registro existente.
  assert.equal((await api(`/produtos/${id}`, { method: "PUT", body: { ...produto(), estoque: 0, preco: 29.9 } })).status, 200);
  for (const invalido of [{ preco: -2 }, { estoque: -1 }, { estoque: null }, { preco: "1.001" }, { categoria: "Inválida" }]) {
    assert.equal((await api("/produtos", { method: "POST", body: { ...produto(), ...invalido } })).status, 400);
  }
  assert.equal((await api("/produtos/abc")).status, 400);
  assert.equal((await api(`/produtos/${id}`, { method: "DELETE" })).status, 200);
  const [restantes] = await ambiente.pool.query("SELECT id FROM produtos WHERE id = ?", [id]);
  assert.equal(restantes.length, 0);
});

await t.test("eventos executam CRUD; inscrições respeitam vagas, duplicatas e cancelamento", async () => {
  const criado = await api("/eventos", { method: "POST", body: evento() });
  const id = criado.dados.id;
  assert.equal(criado.status, 201);
  assert.equal((await api(`/eventos/${id}`)).dados.vagas, 1);
  assert.equal((await api(`/eventos/${id}/inscricoes`, { method: "POST", body: {} })).status, 201);
  assert.equal((await api(`/eventos/${id}/inscricoes`, { method: "POST", body: {} })).status, 409);
  assert.equal((await api(`/eventos/${id}/inscricoes`, { method: "POST", conta: "b", body: {} })).status, 409);
  assert.equal((await api(`/eventos/${id}`, { method: "PUT", body: evento(2) })).status, 200);
  assert.equal((await api(`/eventos/${id}/inscricoes`, { method: "POST", conta: "b", body: {} })).status, 201);
  assert.equal((await api(`/eventos/${id}`, { method: "PUT", body: evento(1) })).status, 409);
  assert.equal((await api(`/eventos/${id}/inscricoes`, { method: "DELETE", body: {} })).status, 200);
  assert.equal((await api(`/eventos/${id}`)).dados.inscritos, 1);
  assert.equal((await api(`/eventos/${id}`, { method: "DELETE" })).status, 200);
  const [[{ total }]] = await ambiente.pool.query("SELECT COUNT(*) AS total FROM inscricoes WHERE evento_id = ?", [id]);
  assert.equal(total, 0);
  assert.equal((await api("/eventos", { method: "POST", body: { ...evento(), data_evento: "2099-02-30T18:00" } })).status, 400);
});

await t.test("compra calcula preços no banco, atualiza estoque e restringe histórico à própria conta", async () => {
  const criado = await api("/produtos", { method: "POST", body: produto("Dados para pedido", 5) });
  const id = criado.dados.id;
  const pedido = await api("/pedidos", { method: "POST", body: { nome: "Aventureira", total: 0.01, itens: [{ produto_id: id, quantidade: 2, preco: 0.01 }] } });
  assert.equal(pedido.status, 201);
  assert.equal(pedido.dados.total, 39.9);
  assert.equal((await api(`/produtos/${id}`)).dados.estoque, 3);
  const historico = await api("/pedidos");
  assert.equal(historico.dados[0].itens[0].quantidade, 2);
  assert.deepEqual((await api("/pedidos?email=a@teste.local", { conta: "b" })).dados, []);
  assert.equal((await api(`/produtos/${id}`, { method: "DELETE" })).status, 200);
  assert.equal((await api("/pedidos")).dados[0].itens[0].nome_produto, "Dados para pedido");
});

await t.test("pedido com estoque insuficiente desfaz todas as etapas da transação", async () => {
  const primeira = await api("/produtos", { method: "POST", body: produto("Item disponível", 2) });
  const segunda = await api("/produtos", { method: "POST", body: produto("Item sem estoque", 0) });
  const [[antes]] = await ambiente.pool.query("SELECT COUNT(*) AS total FROM pedidos");
  const falhou = await api("/pedidos", { method: "POST", body: { nome: "Aventureira", itens: [{ produto_id: primeira.dados.id, quantidade: 1 }, { produto_id: segunda.dados.id, quantidade: 1 }] } });
  assert.equal(falhou.status, 409);
  assert.equal((await api(`/produtos/${primeira.dados.id}`)).dados.estoque, 2);
  const [[depois]] = await ambiente.pool.query("SELECT COUNT(*) AS total FROM pedidos");
  assert.equal(depois.total, antes.total);
  const repetido = await api("/pedidos", { method: "POST", body: { nome: "Aventureira", itens: [{ produto_id: primeira.dados.id, quantidade: 1 }, { produto_id: primeira.dados.id, quantidade: 1 }] } });
  assert.equal(repetido.status, 400);
});

await t.test("duas compras simultâneas não vendem a mesma última unidade", async () => {
  const criado = await api("/produtos", { method: "POST", body: produto("Última unidade", 1) });
  const body = { nome: "Aventureiro", itens: [{ produto_id: criado.dados.id, quantidade: 1 }] };
  const respostas = await Promise.all([api("/pedidos", { method: "POST", body }), api("/pedidos", { method: "POST", body, conta: "b" })]);
  assert.deepEqual(respostas.map(resposta => resposta.status).sort(), [201, 409]);
  assert.equal((await api(`/produtos/${criado.dados.id}`)).dados.estoque, 0);
});

await t.test("perfil persiste apresentação, mantém autoria e não permite alterar permissões pelo formulário", async () => {
  const publicacao = await api("/publicacoes", { method: "POST", body: { conteudo: "Relato do teste do perfil.", categoria: "Conversa" } });
  const encontro = await api("/eventos", { method: "POST", body: evento(4) });
  await api(`/eventos/${encontro.dados.id}/inscricoes`, { method: "POST", body: {} });
  const perfil = { nome: "Mestra da Taverna", bio: "Gosto de histórias coletivas e de receber novos jogadores.", sistema_preferido: "Tormenta20", papel: "membro", email: "troca@indevida.local" };
  const atualizado = await api("/auth/perfil", { method: "PUT", body: perfil });
  assert.equal(atualizado.status, 200);
  assert.equal(atualizado.dados.usuario.papel, "admin");
  assert.equal(atualizado.dados.usuario.email, "a@teste.local");
  const consulta = await api("/auth/perfil");
  assert.equal(consulta.dados.usuario.nome, perfil.nome);
  assert.equal(consulta.dados.usuario.bio, perfil.bio);
  assert.ok(consulta.dados.totais.publicacoes >= 1);
  assert.ok(consulta.dados.totais.pedidos >= 1);
  assert.equal(consulta.dados.totais.inscricoes, 1);
  assert.equal(consulta.dados.eventos[0].id, encontro.dados.id);
  assert.equal((await api(`/publicacoes/${publicacao.dados.id}`)).dados.autor, perfil.nome);
  const [[inscricao]] = await ambiente.pool.query("SELECT nome FROM inscricoes WHERE evento_id = ?", [encontro.dados.id]);
  assert.equal(inscricao.nome, perfil.nome);
  assert.equal((await api("/auth/perfil", { method: "PUT", body: { ...perfil, bio: "x".repeat(301) } })).status, 400);
  assert.equal((await api("/auth/perfil", { method: "PUT", body: { ...perfil, sistema_preferido: "Inválido" } })).status, 400);
  const alteracaoB = await api("/auth/perfil", { method: "PUT", conta: "b", body: { ...perfil, nome: "Aventureiro B", papel: "admin" } });
  assert.equal(alteracaoB.dados.usuario.papel, "membro");
  assert.equal((await api("/produtos", { method: "POST", conta: "b", body: produto() })).status, 403);
  const outra = await api("/publicacoes", { method: "POST", conta: "b", body: { conteudo: "Uma história que pertence ao membro B.", categoria: "Conversa" } });
  const original = (await api(`/publicacoes/${outra.dados.id}`)).dados;
  assert.equal((await api(`/publicacoes/${outra.dados.id}`, { method: "PUT", body: { conteudo: "Texto moderado pela equipe.", categoria: "Conversa" } })).status, 200);
  const moderada = (await api(`/publicacoes/${outra.dados.id}`)).dados;
  assert.equal(moderada.usuario_id, original.usuario_id);
  assert.equal(moderada.autor, original.autor);
});

await t.test("administradores gerenciam pessoas e permissões sem remover o último administrador", async () => {
  const body = { nome: "Nova Pessoa", email: "nova@teste.local", papel: "membro", bio: "", sistema_preferido: "Estou começando", senha: "SenhaInicial123!" };
  assert.equal((await api("/admin/membros", { conta: "b" })).status, 403);
  assert.equal((await api("/admin/membros", { method: "POST", conta: "b", body })).status, 403);
  const criado = await api("/admin/membros", { method: "POST", body });
  assert.equal(criado.status, 201);
  const id = criado.dados.id;
  assert.equal((await api("/admin/membros", { method: "POST", body })).status, 409);
  assert.equal((await api("/auth/login", { method: "POST", conta: "c", body: { email: body.email, senha: body.senha } })).status, 200);
  assert.equal((await api(`/admin/membros/${id}`, { method: "PUT", body: { ...body, papel: "admin", senha: "" } })).status, 200);
  assert.equal((await api("/auth/me", { conta: "c" })).dados.usuario.papel, "admin");
  assert.equal((await api("/admin/membros", { conta: "c" })).status, 200);
  const membro = (await api("/admin/membros")).dados.find(usuario => usuario.id === id);
  assert.equal(membro.senha_hash, undefined);
  assert.equal((await api(`/admin/membros/${id}`, { method: "PUT", body: { ...body, senha: "SenhaNova456!" } })).status, 200);
  assert.equal((await api("/auth/me", { conta: "c" })).dados.usuario, null);
  assert.equal((await api("/auth/login", { method: "POST", conta: "c", body: { email: body.email, senha: body.senha } })).status, 401);
  assert.equal((await api("/auth/login", { method: "POST", conta: "c", body: { email: body.email, senha: "SenhaNova456!" } })).status, 200);
  const eu = (await api("/auth/me")).dados.usuario;
  assert.equal((await api(`/admin/membros/${eu.id}`, { method: "PUT", body: { ...eu, papel: "membro" } })).status, 409);
  assert.equal((await api(`/admin/membros/${eu.id}`, { method: "DELETE" })).status, 409);
  assert.equal((await api(`/admin/membros/${id}`, { method: "DELETE" })).status, 200);
  assert.equal((await api("/auth/me", { conta: "c" })).dados.usuario, null);
});

await t.test("equipe acompanha pedidos e cancelamento devolve estoque uma única vez", async () => {
  const criado = await api("/produtos", { method: "POST", body: produto("Produto para cancelar", 4) });
  const body = { nome: "Cliente do pedido", itens: [{ produto_id: criado.dados.id, quantidade: 2 }] };
  const pedido = await api("/pedidos", { method: "POST", conta: "b", body });
  const id = pedido.dados.id;
  assert.equal((await api("/admin/pedidos", { conta: "b" })).status, 403);
  assert.ok((await api("/admin/pedidos")).dados.some(item => item.id === id));
  const alteracao = { nome: "Cliente atualizado", email: "b@teste.local", status: "preparando" };
  assert.equal((await api(`/admin/pedidos/${id}`, { method: "PUT", body: alteracao })).status, 200);
  assert.equal((await api(`/produtos/${criado.dados.id}`)).dados.estoque, 2);
  alteracao.status = "cancelado";
  assert.equal((await api(`/admin/pedidos/${id}`, { method: "PUT", body: alteracao })).status, 200);
  assert.equal((await api(`/admin/pedidos/${id}`, { method: "PUT", body: alteracao })).status, 200);
  assert.equal((await api(`/produtos/${criado.dados.id}`)).dados.estoque, 4);
  assert.equal((await api(`/admin/pedidos/${id}`, { method: "PUT", body: { ...alteracao, status: "concluido" } })).status, 409);
  assert.equal((await api(`/admin/pedidos/${id}`, { method: "DELETE" })).status, 200);
  assert.equal((await api(`/produtos/${criado.dados.id}`)).dados.estoque, 4);
  const outro = await api("/pedidos", { method: "POST", conta: "b", body });
  assert.equal((await api(`/admin/pedidos/${outro.dados.id}`, { method: "DELETE" })).status, 200);
  assert.equal((await api(`/produtos/${criado.dados.id}`)).dados.estoque, 4);
});

await t.test("equipe adiciona e remove pessoas de eventos e edita a apresentação pública", async () => {
  const eventoCriado = await api("/eventos", { method: "POST", body: evento(1) });
  const pessoa = (await api("/auth/me", { conta: "b" })).dados.usuario;
  const rota = `/admin/eventos/${eventoCriado.dados.id}/inscricoes`;
  assert.equal((await api(rota, { conta: "b" })).status, 403);
  assert.equal((await api(rota, { method: "POST", body: { usuario_id: pessoa.id } })).status, 201);
  assert.equal((await api(rota, { method: "POST", body: { usuario_id: pessoa.id } })).status, 409);
  const lista = await api(rota);
  assert.equal(lista.dados.inscricoes.length, 1);
  assert.equal((await api(`/admin/inscricoes/${lista.dados.inscricoes[0].id}`, { method: "DELETE" })).status, 200);
  assert.equal((await api(rota)).dados.inscricoes.length, 0);
  const original = (await api("/comunidade")).dados;
  assert.equal((await api("/admin/comunidade", { method: "PUT", conta: "b", body: original })).status, 403);
  assert.equal((await api("/admin/comunidade", { method: "PUT", body: { ...original, descricao: "Uma nova apresentação da comunidade de RPG." } })).status, 200);
  assert.equal((await api("/comunidade")).dados.descricao, "Uma nova apresentação da comunidade de RPG.");
  assert.equal((await api("/admin/comunidade", { method: "PUT", body: { ...original, link_redes: "javascript:alert(1)" } })).status, 400);
  assert.equal((await api("/admin/comunidade", { method: "PUT", body: original })).status, 200);
  const resumo = await api("/admin/resumo");
  assert.equal(resumo.status, 200);
  assert.ok(resumo.dados.totais.membros >= 2);
  assert.equal((await api("/admin/resumo", { conta: "b" })).status, 403);
});

await t.test("logout invalida a sessão no banco", async () => {
  assert.equal((await api("/auth/logout", { method: "POST", body: {} })).status, 200);
  assert.equal((await api("/auth/me")).dados.usuario, null);
  assert.equal((await api("/pedidos")).status, 401);
});
} finally {
  await ambiente.encerrar();
}
});
