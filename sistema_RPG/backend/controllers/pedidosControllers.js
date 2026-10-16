import { pool } from "../database/conexao.js";
import { ErroHttp } from "../middlewares/errosMiddleware.js";
import { texto, inteiro } from "./validacoes.js";

export async function listarPedidos(req, res) {
  const [pedidos] = await pool.query("SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY id DESC", [req.usuario.id]);
  for (const pedido of pedidos) {
    const [itens] = await pool.query("SELECT nome_produto, quantidade, preco_unitario FROM pedido_itens WHERE pedido_id = ? ORDER BY id", [pedido.id]);
    pedido.itens = itens;
  }
  res.json(pedidos);
}

export async function cadastrarPedido(req, res) {
  const nome = texto(req.body.nome, "Nome", 80, 2);
  const email = req.usuario.email;
  if (!Array.isArray(req.body.itens) || !req.body.itens.length || req.body.itens.length > 50) {
    throw new ErroHttp(400, "O carrinho deve ter entre 1 e 50 produtos.");
  }
  const itens = req.body.itens.map(item => ({
    produto_id: inteiro(item?.produto_id, "Produto"),
    quantidade: inteiro(item?.quantidade, "Quantidade", 1, 99)
  })).sort((a, b) => a.produto_id - b.produto_id);
  if (new Set(itens.map(item => item.produto_id)).size !== itens.length) {
    throw new ErroHttp(400, "Há produtos repetidos no carrinho.");
  }
  const conexao = await pool.getConnection();
  try {
    // Todas as etapas confirmam juntas ou são desfeitas: pedido, itens e estoque.
    await conexao.beginTransaction();
    let totalCentavos = 0;
    for (const item of itens) {
      const [produtos] = await conexao.query("SELECT * FROM produtos WHERE id = ? FOR UPDATE", [item.produto_id]);
      if (!produtos.length) throw new ErroHttp(409, "Um produto do carrinho foi removido. Atualize a loja.");
      const produto = produtos[0];
      if (produto.estoque < item.quantidade) throw new ErroHttp(409, `Estoque insuficiente para ${produto.nome}.`);
      item.nome = produto.nome;
      item.preco = produto.preco;
      totalCentavos += Math.round(produto.preco * 100) * item.quantidade;
    }
    // O preço é sempre consultado no MySQL; valores enviados pelo navegador são ignorados.
    const total = totalCentavos / 100;
    const [resultado] = await conexao.query("INSERT INTO pedidos (nome, email, total, usuario_id, status) VALUES (?, ?, ?, ?, 'demonstrativo')", [nome, email, total, req.usuario.id]);
    for (const item of itens) {
      await conexao.query("INSERT INTO pedido_itens (pedido_id, produto_id, nome_produto, quantidade, preco_unitario) VALUES (?, ?, ?, ?, ?)", [resultado.insertId, item.produto_id, item.nome, item.quantidade, item.preco]);
      await conexao.query("UPDATE produtos SET estoque = estoque - ? WHERE id = ?", [item.quantidade, item.produto_id]);
    }
    await conexao.commit();
    res.status(201).json({ mensagem: "Pedido demonstrativo registrado. Nenhuma cobrança foi realizada.", id: resultado.insertId, total, status: "demonstrativo" });
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}
