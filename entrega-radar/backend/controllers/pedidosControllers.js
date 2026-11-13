const pool = require('../database/conexao');
const { ErroHttp } = require('../middlewares/errosMiddleware');
const { texto } = require('../services/validacoes');

const etapaInicial = 'aguardando_confirmacao';
const campos = 'material, fornecedor, origem, destino, quantidade, unidade, prazo_combinado';
const selecao = `SELECT id, material, fornecedor, origem, destino, quantidade, unidade,
    DATE_FORMAT(prazo_combinado, '%Y-%m-%d') AS prazo_combinado, etapa,
    (prazo_combinado < CURDATE() AND etapa NOT IN ('entregue', 'cancelado')) AS prazo_vencido
    FROM pedidos`;

function idPedido(req) {
    const id = req.params.id;
    if (!/^[1-9][0-9]{0,9}$/.test(id) || Number(id) > 4294967295) {
        throw new ErroHttp(400, 'Identificador do pedido inválido.');
    }
    return Number(id);
}

function dadosPedido(body) {
    const nomes = campos.split(', ');
    if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        Object.keys(body).some((campo) => !nomes.includes(campo))
    ) {
        throw new ErroHttp(400, 'Informe apenas os campos do pedido.');
    }

    const quantidade =
        typeof body.quantidade === 'number' ? String(body.quantidade) : body.quantidade;
    if (
        typeof quantidade !== 'string' ||
        !/^\d{1,9}(?:\.\d{1,3})?$/.test(quantidade) ||
        Number(quantidade) <= 0
    ) {
        throw new ErroHttp(
            400,
            'Quantidade: informe um valor positivo com até três casas decimais.'
        );
    }

    const prazo = body.prazo_combinado;
    if (typeof prazo !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(prazo)) {
        throw new ErroHttp(400, 'Informe um prazo válido.');
    }
    const data = new Date(prazo + 'T00:00:00Z');
    if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== prazo) {
        throw new ErroHttp(400, 'Informe um prazo válido.');
    }

    return [
        texto(body.material, 'Material', 1, 150),
        texto(body.fornecedor, 'Fornecedor', 1, 150),
        texto(body.origem, 'Origem', 1, 255),
        texto(body.destino, 'Destino', 1, 255),
        quantidade,
        texto(body.unidade, 'Unidade', 1, 20),
        prazo
    ];
}

async function localizar(banco, id, empresa, bloquear = false) {
    const [[pedido]] = await banco.execute(
        `${selecao} WHERE id = ? AND empresa_id = ?${bloquear ? ' FOR UPDATE' : ''}`,
        [id, empresa]
    );
    if (!pedido) throw new ErroHttp(404, 'Pedido não encontrado.');
    return pedido;
}

async function listar(req, res) {
    const [pedidos] = await pool.execute(
        `${selecao} WHERE empresa_id = ? ORDER BY prazo_combinado, id`,
        [req.usuario.empresa_id]
    );
    res.json({ pedidos });
}

async function consultar(req, res) {
    const pedido = await localizar(pool, idPedido(req), req.usuario.empresa_id);
    res.json({ pedido });
}

async function criar(req, res) {
    const dados = dadosPedido(req.body);
    const empresa = req.usuario.empresa_id;
    const [resultado] = await pool.execute(
        `INSERT INTO pedidos (empresa_id, ${campos}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [empresa, ...dados]
    );
    res.location(`/api/pedidos/${resultado.insertId}`).status(201).json({ id: resultado.insertId });
}

async function alterarPedidoInicial(req, operacao) {
    const id = idPedido(req);
    const empresa = req.usuario.empresa_id;
    const conexao = await pool.getConnection();
    try {
        await conexao.beginTransaction();
        const pedido = await localizar(conexao, id, empresa, true);
        if (pedido.etapa !== etapaInicial) {
            throw new ErroHttp(409, 'O pedido já avançou e seus dados iniciais foram preservados.');
        }
        await operacao(conexao, id, empresa);
        await conexao.commit();
    } catch (erro) {
        await conexao.rollback();
        if (erro.code === 'ER_ROW_IS_REFERENCED_2') {
            throw new ErroHttp(
                409,
                'O pedido possui registros vinculados e precisa ser preservado.'
            );
        }
        throw erro;
    } finally {
        conexao.release();
    }
}

async function atualizar(req, res) {
    const dados = dadosPedido(req.body);
    await alterarPedidoInicial(req, (banco, id, empresa) =>
        banco.execute(
            `UPDATE pedidos SET material = ?, fornecedor = ?, origem = ?, destino = ?,
                quantidade = ?, unidade = ?, prazo_combinado = ? WHERE id = ? AND empresa_id = ?`,
            [...dados, id, empresa]
        )
    );
    res.status(204).end();
}

async function excluir(req, res) {
    await alterarPedidoInicial(req, (banco, id, empresa) =>
        banco.execute('DELETE FROM pedidos WHERE id = ? AND empresa_id = ?', [id, empresa])
    );
    res.status(204).end();
}

module.exports = { listar, consultar, criar, atualizar, excluir };
