import { pool } from "../database/conexao.js";
import { ErroHttp } from "../middlewares/errosMiddleware.js";
import { texto } from "./validacoes.js";

export async function consultarComunidade(req, res) {
  const [[comunidade]] = await pool.query("SELECT nome, descricao, endereco, horario, link_redes FROM comunidade WHERE id = 1");
  res.json(comunidade);
}

export async function atualizarComunidade(req, res) {
  const campos = [texto(req.body.nome, "Nome da comunidade", 80, 2), texto(req.body.descricao, "Apresentação", 1800, 10), texto(req.body.endereco, "Endereço", 200, 3), texto(req.body.horario, "Horário", 150, 3)];
  let link;
  try { link = new URL(texto(req.body.link_redes, "Link das redes", 500)); }
  catch { throw new ErroHttp(400, "Informe um link válido para as redes."); }
  if (link.protocol !== "https:" || link.username || link.password) throw new ErroHttp(400, "Use um link HTTPS válido para as redes.");
  await pool.query("UPDATE comunidade SET nome = ?, descricao = ?, endereco = ?, horario = ?, link_redes = ? WHERE id = 1", [...campos, link.href]);
  res.json({ mensagem: "Apresentação da comunidade atualizada." });
}
