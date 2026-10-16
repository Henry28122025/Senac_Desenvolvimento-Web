import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { pool } from "../database/conexao.js";
import { ErroHttp } from "../middlewares/errosMiddleware.js";
import { texto, emailValido, categoria, idParametro, inteiro } from "./validacoes.js";

const gerarHash = promisify(scrypt);
const sistemas = ["Estou começando", "Dungeons & Dragons", "Tormenta20", "Pathfinder", "Ordem Paranormal", "Outros sistemas"];

function validarMembro(body) {
  return [texto(body.nome, "Nome", 80, 2), emailValido(body.email), categoria(body.papel, ["membro", "admin"]), texto(body.bio ?? "", "Apresentação", 300, 0), categoria(body.sistema_preferido || "Estou começando", sistemas)];
}

async function senhaHash(senha) {
  if (typeof senha !== "string" || senha.length < 8 || senha.length > 128) throw new ErroHttp(400, "A senha deve ter entre 8 e 128 caracteres.");
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await gerarHash(senha, salt, 64)).toString("hex")}`;
}

// As mudanças de equipe são serializadas para preservar pelo menos um administrador.
async function alterarEquipe(req, operacao) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const [admins] = await conexao.query("SELECT id FROM usuarios WHERE papel = 'admin' ORDER BY id FOR UPDATE");
    if (!admins.some(usuario => usuario.id === req.usuario.id)) throw new ErroHttp(403, "Seu acesso à equipe foi removido.");
    const resultado = await operacao(conexao, admins);
    await conexao.commit();
    return resultado;
  } catch (erro) {
    await conexao.rollback();
    if (erro.code === "ER_DUP_ENTRY") throw new ErroHttp(409, "Este e-mail já pertence a outra conta.");
    throw erro;
  } finally { conexao.release(); }
}

export async function resumoAdmin(req, res) {
  const [[totais]] = await pool.query(`SELECT
    (SELECT COUNT(*) FROM usuarios) AS membros,
    (SELECT COUNT(*) FROM usuarios WHERE papel = 'admin') AS administradores,
    (SELECT COUNT(*) FROM produtos) AS produtos,
    (SELECT COUNT(*) FROM produtos WHERE estoque <= 3) AS estoque_baixo,
    (SELECT COUNT(*) FROM eventos) AS eventos,
    (SELECT COUNT(*) FROM publicacoes) AS publicacoes,
    (SELECT COUNT(*) FROM pedidos) AS pedidos,
    (SELECT COALESCE(SUM(total), 0) FROM pedidos WHERE status <> 'cancelado') AS total_demonstrativo`);
  const [recentes] = await pool.query("SELECT id, nome, total, status, criado_em FROM pedidos ORDER BY id DESC LIMIT 5");
  const [estoque] = await pool.query("SELECT id, nome, estoque FROM produtos WHERE estoque <= 3 ORDER BY estoque, id LIMIT 5");
  res.json({ totais, recentes, estoque });
}

export async function listarMembros(req, res) {
  const [membros] = await pool.query("SELECT id, nome, email, papel, bio, sistema_preferido, criado_em FROM usuarios ORDER BY id DESC");
  res.json(membros);
}

export async function criarMembro(req, res) {
  const campos = validarMembro(req.body);
  const hash = await senhaHash(req.body.senha);
  const id = await alterarEquipe(req, async conexao => {
    const [resultado] = await conexao.query("INSERT INTO usuarios (nome, email, papel, bio, sistema_preferido, senha_hash) VALUES (?, ?, ?, ?, ?, ?)", [...campos, hash]);
    return resultado.insertId;
  });
  res.status(201).json({ mensagem: "Pessoa adicionada à comunidade.", id });
}

export async function editarMembro(req, res) {
  const id = idParametro(req);
  const campos = validarMembro(req.body);
  const hash = req.body.senha ? await senhaHash(req.body.senha) : null;
  await alterarEquipe(req, async (conexao, admins) => {
    const [membros] = await conexao.query("SELECT id, papel FROM usuarios WHERE id = ? FOR UPDATE", [id]);
    if (!membros.length) throw new ErroHttp(404, "Pessoa não encontrada.");
    if (membros[0].papel === "admin" && campos[2] !== "admin" && admins.length === 1) throw new ErroHttp(409, "Mantenha pelo menos um administrador na taverna.");
    await conexao.query("UPDATE usuarios SET nome = ?, email = ?, papel = ?, bio = ?, sistema_preferido = ? WHERE id = ?", [...campos, id]);
    await conexao.query("UPDATE publicacoes SET autor = ? WHERE usuario_id = ?", [campos[0], id]);
    await conexao.query("UPDATE inscricoes SET nome = ? WHERE usuario_id = ?", [campos[0], id]);
    if (hash) {
      await conexao.query("UPDATE usuarios SET senha_hash = ? WHERE id = ?", [hash, id]);
      await conexao.query("DELETE FROM sessoes WHERE usuario_id = ?", [id]);
    }
  });
  res.json({ mensagem: "Cadastro e permissões atualizados." });
}

export async function excluirMembro(req, res) {
  const id = idParametro(req);
  await alterarEquipe(req, async (conexao, admins) => {
    const [usuarios] = await conexao.query("SELECT id, papel FROM usuarios WHERE id = ? FOR UPDATE", [id]);
    if (!usuarios.length) throw new ErroHttp(404, "Pessoa não encontrada.");
    if (usuarios[0].papel === "admin" && admins.length === 1) throw new ErroHttp(409, "Mantenha pelo menos um administrador na taverna.");
    if (id === req.usuario.id) throw new ErroHttp(409, "Para excluir sua conta, entre com outro administrador.");
    await conexao.query("DELETE FROM usuarios WHERE id = ?", [id]);
  });
  res.json({ mensagem: "Pessoa removida. O histórico dos pedidos foi preservado." });
}

export async function listarPedidosAdmin(req, res) {
  const [pedidos] = await pool.query("SELECT * FROM pedidos ORDER BY id DESC");
  const [itens] = await pool.query("SELECT pedido_id, nome_produto, quantidade, preco_unitario FROM pedido_itens ORDER BY id");
  for (const pedido of pedidos) pedido.itens = itens.filter(item => item.pedido_id === pedido.id);
  res.json(pedidos);
}

async function devolverEstoque(conexao, pedido) {
  if (pedido.status === "cancelado") return;
  const [itens] = await conexao.query("SELECT produto_id, quantidade FROM pedido_itens WHERE pedido_id = ? ORDER BY produto_id", [pedido.id]);
  for (const item of itens) {
    if (item.produto_id) await conexao.query("UPDATE produtos SET estoque = estoque + ? WHERE id = ?", [item.quantidade, item.produto_id]);
  }
}

export async function alterarPedidoAdmin(req, res) {
  const id = idParametro(req);
  const status = categoria(req.body.status, ["demonstrativo", "preparando", "concluido", "cancelado"]);
  const nome = texto(req.body.nome, "Nome do comprador", 80, 2);
  const email = emailValido(req.body.email);
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const [pedidos] = await conexao.query("SELECT * FROM pedidos WHERE id = ? FOR UPDATE", [id]);
    if (!pedidos.length) throw new ErroHttp(404, "Pedido não encontrado.");
    if (pedidos[0].status === "cancelado" && status !== "cancelado") throw new ErroHttp(409, "Um pedido cancelado não pode ser reaberto. Crie um novo pedido.");
    if (status === "cancelado") await devolverEstoque(conexao, pedidos[0]);
    await conexao.query("UPDATE pedidos SET nome = ?, email = ?, status = ? WHERE id = ?", [nome, email, status, id]);
    await conexao.commit();
    res.json({ mensagem: status === "cancelado" ? "Pedido cancelado e estoque devolvido." : "Pedido atualizado. A compra continua demonstrativa." });
  } catch (erro) { await conexao.rollback(); throw erro; }
  finally { conexao.release(); }
}

export async function excluirPedidoAdmin(req, res) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const [pedidos] = await conexao.query("SELECT * FROM pedidos WHERE id = ? FOR UPDATE", [idParametro(req)]);
    if (!pedidos.length) throw new ErroHttp(404, "Pedido não encontrado.");
    await devolverEstoque(conexao, pedidos[0]);
    await conexao.query("DELETE FROM pedidos WHERE id = ?", [pedidos[0].id]);
    await conexao.commit();
    res.json({ mensagem: "Pedido excluído e estoque disponível restaurado." });
  } catch (erro) { await conexao.rollback(); throw erro; }
  finally { conexao.release(); }
}

export async function listarInscricoesAdmin(req, res) {
  const id = idParametro(req);
  const [eventos] = await pool.query("SELECT id, titulo FROM eventos WHERE id = ?", [id]);
  if (!eventos.length) throw new ErroHttp(404, "Evento não encontrado.");
  const [inscricoes] = await pool.query(`SELECT inscricoes.id, inscricoes.nome, usuarios.email
    FROM inscricoes LEFT JOIN usuarios ON usuarios.id = inscricoes.usuario_id WHERE evento_id = ? ORDER BY inscricoes.id`, [id]);
  res.json({ evento: eventos[0], inscricoes });
}

export async function adicionarInscricaoAdmin(req, res) {
  const id = idParametro(req);
  const usuarioId = inteiro(req.body.usuario_id, "Pessoa");
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const [eventos] = await conexao.query("SELECT * FROM eventos WHERE id = ? FOR UPDATE", [id]);
    if (!eventos.length) throw new ErroHttp(404, "Evento não encontrado.");
    const [usuarios] = await conexao.query("SELECT nome FROM usuarios WHERE id = ?", [usuarioId]);
    if (!usuarios.length) throw new ErroHttp(404, "Pessoa não encontrada.");
    const [[{ total }]] = await conexao.query("SELECT COUNT(*) AS total FROM inscricoes WHERE evento_id = ?", [id]);
    if (total >= eventos[0].vagas) throw new ErroHttp(409, "Todas as vagas estão preenchidas.");
    await conexao.query("INSERT INTO inscricoes (evento_id, usuario_id, nome) VALUES (?, ?, ?)", [id, usuarioId, usuarios[0].nome]);
    await conexao.commit();
    res.status(201).json({ mensagem: "Pessoa adicionada ao evento." });
  } catch (erro) {
    await conexao.rollback();
    if (erro.code === "ER_DUP_ENTRY") throw new ErroHttp(409, "Esta pessoa já está inscrita.");
    throw erro;
  } finally { conexao.release(); }
}

export async function removerInscricaoAdmin(req, res) {
  const [resultado] = await pool.query("DELETE FROM inscricoes WHERE id = ?", [idParametro(req)]);
  if (!resultado.affectedRows) throw new ErroHttp(404, "Inscrição não encontrada.");
  res.json({ mensagem: "Inscrição removida." });
}
