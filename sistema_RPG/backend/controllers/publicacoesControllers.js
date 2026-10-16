import { pool } from "../database/conexao.js";
import { ErroHttp } from "../middlewares/errosMiddleware.js";
import { texto, categoria, idParametro } from "./validacoes.js";

function validarPublicacao(body) {
  return [
    texto(body.autor, "Nome do aventureiro", 80, 2),
    texto(body.conteudo, "Publicação", 1500, 3),
    categoria(body.categoria, ["Conversa", "Procuro mesa", "Relato de aventura"])
  ];
}

export async function listarPublicacoes(req, res) {
  const [publicacoes] = await pool.query("SELECT * FROM publicacoes ORDER BY criado_em DESC, id DESC");
  res.json(publicacoes);
}

export async function buscarPublicacao(req, res) {
  const [publicacoes] = await pool.query("SELECT * FROM publicacoes WHERE id = ?", [idParametro(req)]);
  if (!publicacoes.length) throw new ErroHttp(404, "Publicação não encontrada.");
  res.json(publicacoes[0]);
}

export async function cadastrarPublicacao(req, res) {
  const campos = validarPublicacao({ ...req.body, autor: req.usuario.nome });
  const [resultado] = await pool.query("INSERT INTO publicacoes (autor, conteudo, categoria, usuario_id) VALUES (?, ?, ?, ?)", [...campos, req.usuario.id]);
  res.status(201).json({ mensagem: "Sua aventura chegou ao mural!", id: resultado.insertId });
}

export async function atualizarPublicacao(req, res) {
  const id = idParametro(req);
  const [publicacoes] = await pool.query("SELECT * FROM publicacoes WHERE id = ?", [id]);
  if (!publicacoes.length) throw new ErroHttp(404, "Publicação não encontrada.");
  if (publicacoes[0].usuario_id !== req.usuario.id && req.usuario.papel !== "admin") throw new ErroHttp(403, "Você pode editar apenas suas publicações.");
  const campos = validarPublicacao({ ...req.body, autor: publicacoes[0].autor });
  const [resultado] = await pool.query("UPDATE publicacoes SET autor = ?, conteudo = ?, categoria = ? WHERE id = ?", [...campos, id]);
  if (!resultado.affectedRows) throw new ErroHttp(404, "Publicação não encontrada.");
  res.json({ mensagem: "Publicação atualizada." });
}

export async function excluirPublicacao(req, res) {
  const id = idParametro(req);
  const [publicacoes] = await pool.query("SELECT * FROM publicacoes WHERE id = ?", [id]);
  if (!publicacoes.length) throw new ErroHttp(404, "Publicação não encontrada.");
  if (publicacoes[0].usuario_id !== req.usuario.id && req.usuario.papel !== "admin") throw new ErroHttp(403, "Você pode excluir apenas suas publicações.");
  const [resultado] = await pool.query("DELETE FROM publicacoes WHERE id = ?", [id]);
  if (!resultado.affectedRows) throw new ErroHttp(404, "Publicação não encontrada.");
  res.json({ mensagem: "Publicação excluída." });
}
