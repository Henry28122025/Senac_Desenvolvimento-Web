import { pool } from "../database/conexao.js";
import { ErroHttp } from "../middlewares/errosMiddleware.js";
import { texto, inteiro, categoria, precoValido, idParametro } from "./validacoes.js";

function validarProduto(body) {
  return [
    texto(body.nome, "Nome", 120, 3),
    texto(body.descricao, "Descrição", 1200, 10),
    categoria(body.categoria, ["Dados", "Livros", "Acessórios", "Card games"]),
    precoValido(body.preco),
    inteiro(body.estoque, "Estoque", 0, 99999)
  ];
}

export async function listarProdutos(req, res) {
  const [produtos] = await pool.query("SELECT * FROM produtos ORDER BY id DESC");
  res.json(produtos);
}

export async function buscarProduto(req, res) {
  const [produtos] = await pool.query("SELECT * FROM produtos WHERE id = ?", [idParametro(req)]);
  if (!produtos.length) throw new ErroHttp(404, "Produto não encontrado.");
  res.json(produtos[0]);
}

export async function cadastrarProduto(req, res) {
  const [resultado] = await pool.query("INSERT INTO produtos (nome, descricao, categoria, preco, estoque) VALUES (?, ?, ?, ?, ?)", validarProduto(req.body));
  res.status(201).json({ mensagem: "Produto cadastrado.", id: resultado.insertId });
}

export async function atualizarProduto(req, res) {
  const id = idParametro(req);
  const [resultado] = await pool.query("UPDATE produtos SET nome = ?, descricao = ?, categoria = ?, preco = ?, estoque = ? WHERE id = ?", [...validarProduto(req.body), id]);
  if (!resultado.affectedRows) throw new ErroHttp(404, "Produto não encontrado.");
  res.json({ mensagem: "Produto atualizado." });
}

export async function excluirProduto(req, res) {
  const [resultado] = await pool.query("DELETE FROM produtos WHERE id = ?", [idParametro(req)]);
  if (!resultado.affectedRows) throw new ErroHttp(404, "Produto não encontrado.");
  res.json({ mensagem: "Produto excluído. O histórico dos pedidos foi preservado." });
}
