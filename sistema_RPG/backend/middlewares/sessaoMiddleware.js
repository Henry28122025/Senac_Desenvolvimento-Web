import { createHash } from "node:crypto";
import { pool } from "../database/conexao.js";
import { ErroHttp } from "./errosMiddleware.js";

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function carregarUsuario(req, res, next) {
  const cookie = req.headers.cookie?.split(";").map(item => item.trim()).find(item => item.startsWith("jg_sessao="));
  const token = cookie?.slice("jg_sessao=".length);
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    try {
      const [usuarios] = await pool.query(`SELECT usuarios.id, usuarios.nome, usuarios.email, usuarios.papel, usuarios.bio, usuarios.sistema_preferido
        FROM sessoes JOIN usuarios ON usuarios.id = sessoes.usuario_id
        WHERE sessoes.token_hash = ? AND sessoes.expira_em > NOW()`, [hashToken(token)]);
      req.usuario = usuarios[0] || null;
    } catch (erro) {
      return next(erro);
    }
  }
  next();
}

export function exigirUsuario(req, res, next) {
  if (!req.usuario) throw new ErroHttp(401, "Entre na sua conta para continuar.");
  next();
}

export function exigirAdmin(req, res, next) {
  if (!req.usuario) throw new ErroHttp(401, "Entre na sua conta para continuar.");
  if (req.usuario.papel !== "admin") throw new ErroHttp(403, "Apenas a equipe da taverna pode gerenciar o catálogo e os eventos.");
  next();
}

export function protegerOrigem(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origem = req.headers.origin;
  const permitidas = [`${req.protocol}://${req.get("host")}`, "http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:5501", "http://127.0.0.1:5501"];
  if (origem && !permitidas.includes(origem)) throw new ErroHttp(403, "Origem da requisição não permitida.");
  next();
}
