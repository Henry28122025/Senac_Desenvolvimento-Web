import { pool } from "../database/conexao.js";
import { ErroHttp } from "../middlewares/errosMiddleware.js";
import { texto, inteiro, categoria, dataValida, idParametro } from "./validacoes.js";

function validarEvento(body) {
  return [
    texto(body.titulo, "Título", 120, 3),
    texto(body.descricao, "Descrição", 1200, 10),
    categoria(body.categoria, ["RPG", "Board game", "Card game"]),
    dataValida(body.data_evento),
    texto(body.local, "Local", 150, 3),
    inteiro(body.vagas, "Vagas", 1, 999)
  ];
}

const consulta = `SELECT eventos.*, COUNT(inscricoes.id) AS inscritos
  FROM eventos LEFT JOIN inscricoes ON inscricoes.evento_id = eventos.id`;

export async function listarEventos(req, res) {
  const [eventos] = await pool.query(`${consulta} GROUP BY eventos.id ORDER BY data_evento, eventos.id`);
  res.json(eventos);
}

export async function buscarEvento(req, res) {
  const [eventos] = await pool.query(`${consulta} WHERE eventos.id = ? GROUP BY eventos.id`, [idParametro(req)]);
  if (!eventos.length) throw new ErroHttp(404, "Evento não encontrado.");
  res.json(eventos[0]);
}

export async function cadastrarEvento(req, res) {
  const campos = validarEvento(req.body);
  const [resultado] = await pool.query("INSERT INTO eventos (titulo, descricao, categoria, data_evento, local, vagas) VALUES (?, ?, ?, ?, ?, ?)", campos);
  res.status(201).json({ mensagem: "Evento cadastrado.", id: resultado.insertId });
}

export async function atualizarEvento(req, res) {
  const id = idParametro(req);
  const campos = validarEvento(req.body);
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const [eventos] = await conexao.query("SELECT id FROM eventos WHERE id = ? FOR UPDATE", [id]);
    if (!eventos.length) throw new ErroHttp(404, "Evento não encontrado.");
    const [[{ total }]] = await conexao.query("SELECT COUNT(*) AS total FROM inscricoes WHERE evento_id = ?", [id]);
    if (campos[5] < total) throw new ErroHttp(409, "As vagas não podem ser menores que o número de inscritos.");
    await conexao.query("UPDATE eventos SET titulo = ?, descricao = ?, categoria = ?, data_evento = ?, local = ?, vagas = ? WHERE id = ?", [...campos, id]);
    await conexao.commit();
    res.json({ mensagem: "Evento atualizado." });
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

export async function excluirEvento(req, res) {
  const [resultado] = await pool.query("DELETE FROM eventos WHERE id = ?", [idParametro(req)]);
  if (!resultado.affectedRows) throw new ErroHttp(404, "Evento não encontrado.");
  res.json({ mensagem: "Evento e suas inscrições excluídos." });
}

export async function inscreverNoEvento(req, res) {
  const id = idParametro(req);
  const nome = req.usuario.nome;
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const [eventos] = await conexao.query("SELECT * FROM eventos WHERE id = ? FOR UPDATE", [id]);
    if (!eventos.length) throw new ErroHttp(404, "Evento não encontrado.");
    // Datas do banco representam o horário local da taverna, America/Sao_Paulo.
    const agora = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" }).format(new Date());
    if (eventos[0].data_evento <= agora) throw new ErroHttp(409, "As inscrições para este evento já encerraram.");
    const [[{ total }]] = await conexao.query("SELECT COUNT(*) AS total FROM inscricoes WHERE evento_id = ?", [id]);
    if (total >= eventos[0].vagas) throw new ErroHttp(409, "Este evento está com todas as vagas preenchidas.");
    const [resultado] = await conexao.query("INSERT INTO inscricoes (evento_id, nome, usuario_id) VALUES (?, ?, ?)", [id, nome, req.usuario.id]);
    await conexao.commit();
    res.status(201).json({ mensagem: "Seu lugar na mesa está reservado!", id: resultado.insertId });
  } catch (erro) {
    await conexao.rollback();
    if (erro.code === "ER_DUP_ENTRY") throw new ErroHttp(409, "Você já está inscrito no evento.");
    throw erro;
  } finally {
    conexao.release();
  }
}

export async function cancelarInscricao(req, res) {
  const [resultado] = await pool.query("DELETE FROM inscricoes WHERE evento_id = ? AND usuario_id = ?", [idParametro(req), req.usuario.id]);
  if (!resultado.affectedRows) throw new ErroHttp(404, "Inscrição não encontrada.");
  res.json({ mensagem: "Inscrição cancelada." });
}
