const pool = require('../database/conexao');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { cadastro, credenciais } = require('../services/validacoes');
const { hashSenha, verificarSenha } = require('../services/senhas');
const { ErroHttp } = require('../middlewares/errosMiddleware');

// Mantém a verificação de senha mesmo quando o e-mail não está cadastrado.
const hashFicticio = 'scrypt$32768$8$3$' + '0'.repeat(32) + '$' + '0'.repeat(128);

exports.cadastrar = async (req, res) => {
    const dados = cadastro(req.body);
    const hash = await hashSenha(dados.senha);
    const conexao = await pool.getConnection();

    try {
        await conexao.beginTransaction();
        // Nomes de tabelas são constantes internas; dados sempre usam placeholders.
        const sql =
            dados.perfil === 'contratante'
                ? 'INSERT INTO empresas (nome) VALUES (?)'
                : 'INSERT INTO transportadoras (nome) VALUES (?)';
        const [organizacao] = await conexao.execute(sql, [dados.organizacao]);
        const [usuario] = await conexao.execute(
            'INSERT INTO usuarios (nome,email,senha_hash,perfil,empresa_id,transportadora_id) VALUES (?,?,?,?,?,?)',
            [
                dados.nome,
                dados.email,
                hash,
                dados.perfil,
                dados.perfil === 'contratante' ? organizacao.insertId : null,
                dados.perfil === 'transportadora' ? organizacao.insertId : null
            ]
        );

        await conexao.commit();

        res.status(201).json({
            mensagem: 'Cadastro concluído. Entre com seu e-mail e senha.',
            usuario: {
                id: usuario.insertId,
                nome: dados.nome,
                email: dados.email,
                perfil: dados.perfil
            }
        });
    } catch (erro) {
        await conexao.rollback();
        throw erro;
    } finally {
        conexao.release();
    }
};

exports.login = async (req, res) => {
    const dados = credenciais(req.body);
    const [usuarios] = await pool.execute(
        'SELECT id,nome,email,perfil,senha_hash,ativo FROM usuarios WHERE email = ?',
        [dados.email]
    );

    const usuario = usuarios[0];
    const senhaCorreta = await verificarSenha(dados.senha, usuario?.senha_hash || hashFicticio);

    if (!usuario || !senhaCorreta || !usuario.ativo) {
        throw new ErroHttp(401, 'E-mail ou senha incorretos.');
    }

    const token = jwt.sign({}, config.secret, {
        algorithm: 'HS256',
        subject: String(usuario.id),
        issuer: config.issuer,
        audience: config.audience,
        expiresIn: config.ttl
    });

    res.json({ token, tipo: 'Bearer', expiraEm: config.ttl });
};
