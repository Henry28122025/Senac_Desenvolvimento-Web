const jwt = require('jsonwebtoken');
const config = require('../config');
const pool = require('../database/conexao');
const { ErroHttp } = require('./errosMiddleware');
module.exports = async (req,res,next) => {
 const match = /^Bearer ([^\s]+)$/.exec(req.get('Authorization') || '');
 let payload;
 try {
  if (!match) throw new Error();
  payload = jwt.verify(match[1],config.secret,{ algorithms:['HS256'],issuer:config.issuer,audience:config.audience,maxAge:config.ttl });
  if (!/^\d+$/.test(payload.sub) || !Number.isFinite(payload.exp)) throw new Error();
 } catch { throw new ErroHttp(401,'Token ausente, inválido ou expirado. Entre novamente.'); }
 // Perfil e organização vêm do banco, nunca de parâmetros enviados pelo cliente.
 const [rows] = await pool.execute('SELECT id,nome,email,perfil,empresa_id,transportadora_id FROM usuarios WHERE id = ? AND ativo = 1',[payload.sub]);
 if (!rows.length) throw new ErroHttp(401,'Usuário indisponível.');
 req.usuario = rows[0]; next();
};
