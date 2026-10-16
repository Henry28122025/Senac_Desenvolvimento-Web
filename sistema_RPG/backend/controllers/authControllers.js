import { randomBytes, scrypt as scryptOriginal, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { pool } from "../database/conexao.js";
import { ErroHttp } from "../middlewares/errosMiddleware.js";
import { hashToken } from "../middlewares/sessaoMiddleware.js";
import { texto, emailValido, categoria } from "./validacoes.js";

const scrypt = promisify(scryptOriginal);
const cookieOpcoes = { httpOnly: true, sameSite: "lax", path: "/api" };

function senhaValida(senha) {
  if (typeof senha !== "string" || senha.length < 8 || senha.length > 128) {
    throw new ErroHttp(400, "A senha deve ter entre 8 e 128 caracteres.");
  }
  return senha;
}

async function abrirSessao(usuario, req, res) {
  const token = randomBytes(32).toString("hex");
  await pool.query("DELETE FROM sessoes WHERE expira_em <= NOW()");
  await pool.query("INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 8 HOUR))", [hashToken(token), usuario.id]);
  res.cookie("jg_sessao", token, { ...cookieOpcoes, secure: req.secure, maxAge: 8 * 60 * 60 * 1000 });
}

export async function cadastrarUsuario(req, res) {
  const nome = texto(req.body.nome, "Nome do aventureiro", 80, 2);
  const email = emailValido(req.body.email);
  const senha = senhaValida(req.body.senha);
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(senha, salt, 64)).toString("hex");
  let resultado;
  try {
    [resultado] = await pool.query("INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)", [nome, email, `${salt}:${hash}`]);
  } catch (erro) {
    if (erro.code === "ER_DUP_ENTRY") throw new ErroHttp(409, "Este e-mail já possui uma conta. Use Entrar.");
    throw erro;
  }
  const usuario = { id: resultado.insertId, nome, email, papel: "membro", bio: "", sistema_preferido: "Estou começando" };
  await abrirSessao(usuario, req, res);
  res.status(201).json({ mensagem: "Bem-vindo à taverna!", usuario });
}

export async function entrar(req, res) {
  const email = emailValido(req.body.email);
  const senha = senhaValida(req.body.senha);
  const [usuarios] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);
  const usuario = usuarios[0];
  // Mesmo sem usuário, calcula um hash para manter o processamento semelhante.
  const [salt, hash] = (usuario?.senha_hash || `${"0".repeat(32)}:${"0".repeat(128)}`).split(":");
  const candidato = await scrypt(senha, salt, 64);
  if (!usuario || !timingSafeEqual(Buffer.from(hash, "hex"), candidato)) throw new ErroHttp(401, "E-mail ou senha incorretos.");
  const publico = { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel, bio: usuario.bio, sistema_preferido: usuario.sistema_preferido };
  await abrirSessao(publico, req, res);
  res.json({ mensagem: "Bom ter você de volta!", usuario: publico });
}

export async function minhaConta(req, res) {
  if (!req.usuario) return res.json({ usuario: null, inscricoes: [] });
  const [inscricoes] = await pool.query("SELECT evento_id FROM inscricoes WHERE usuario_id = ?", [req.usuario.id]);
  res.json({ usuario: req.usuario, inscricoes: inscricoes.map(item => item.evento_id) });
}

export async function meuPerfil(req, res) {
  const id = req.usuario.id;
  const [[totais]] = await pool.query(`SELECT
    (SELECT COUNT(*) FROM publicacoes WHERE usuario_id = ?) AS publicacoes,
    (SELECT COUNT(*) FROM inscricoes WHERE usuario_id = ?) AS inscricoes,
    (SELECT COUNT(*) FROM pedidos WHERE usuario_id = ?) AS pedidos`, [id, id, id]);
  const [eventos] = await pool.query(`SELECT eventos.* FROM eventos
    JOIN inscricoes ON inscricoes.evento_id = eventos.id
    WHERE inscricoes.usuario_id = ? ORDER BY data_evento`, [id]);
  res.json({ usuario: req.usuario, totais, eventos });
}

export async function atualizarPerfil(req, res) {
  const nome = texto(req.body.nome, "Nome do aventureiro", 80, 2);
  const bio = texto(req.body.bio ?? "", "Apresentação", 300, 0);
  const sistema = categoria(req.body.sistema_preferido, ["Estou começando", "Dungeons & Dragons", "Tormenta20", "Pathfinder", "Ordem Paranormal", "Outros sistemas"]);
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    // Atualiza os nomes exibidos no mural e nas inscrições junto com o perfil.
    await conexao.query("UPDATE usuarios SET nome = ?, bio = ?, sistema_preferido = ? WHERE id = ?", [nome, bio, sistema, req.usuario.id]);
    await conexao.query("UPDATE publicacoes SET autor = ? WHERE usuario_id = ?", [nome, req.usuario.id]);
    await conexao.query("UPDATE inscricoes SET nome = ? WHERE usuario_id = ?", [nome, req.usuario.id]);
    await conexao.commit();
    const usuario = { ...req.usuario, nome, bio, sistema_preferido: sistema };
    res.json({ mensagem: "Seu perfil foi atualizado!", usuario });
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

export async function sair(req, res) {
  const token = req.headers.cookie?.split(";").map(item => item.trim()).find(item => item.startsWith("jg_sessao="))?.slice(10);
  if (token && /^[a-f0-9]{64}$/.test(token)) await pool.query("DELETE FROM sessoes WHERE token_hash = ?", [hashToken(token)]);
  res.clearCookie("jg_sessao", { ...cookieOpcoes, secure: req.secure });
  res.json({ mensagem: "Até a próxima aventura!" });
}
