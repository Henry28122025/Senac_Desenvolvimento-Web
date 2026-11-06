const pool = require('../database/conexao');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { cadastro, credenciais } = require('../services/validacoes');
const { hashSenha, verificarSenha } = require('../services/senhas');
const { ErroHttp } = require('../middlewares/errosMiddleware');
const dummy = 'scrypt$32768$8$3$' + '0'.repeat(32) + '$' + '0'.repeat(128);
exports.cadastrar = async (req, res) => {
 const d = cadastro(req.body);
 const hash = await hashSenha(d.senha);
 const c = await pool.getConnection();
 try {
  await c.beginTransaction();
  // Nomes de tabelas são constantes internas; dados sempre usam placeholders.
  const sql = d.perfil === 'contratante' ? 'INSERT INTO empresas (nome) VALUES (?)' : 'INSERT INTO transportadoras (nome) VALUES (?)';
  const [org] = await c.execute(sql, [d.organizacao]);
  const [u] = await c.execute('INSERT INTO usuarios (nome,email,senha_hash,perfil,empresa_id,transportadora_id) VALUES (?,?,?,?,?,?)',
   [d.nome,d.email,hash,d.perfil,d.perfil === 'contratante' ? org.insertId : null,d.perfil === 'transportadora' ? org.insertId : null]);
  await c.commit();
  res.status(201).json({ mensagem: 'Cadastro concluído. Entre com seu e-mail e senha.', usuario: { id:u.insertId,nome:d.nome,email:d.email,perfil:d.perfil } });
 } catch (err) { await c.rollback(); throw err; } finally { c.release(); }
};
exports.login = async (req,res) => {
 const d = credenciais(req.body);
 const [rows] = await pool.execute('SELECT id,nome,email,perfil,senha_hash,ativo FROM usuarios WHERE email = ?', [d.email]);
 const u = rows[0];
 const ok = await verificarSenha(d.senha, u?.senha_hash || dummy);
 if (!u || !ok || !u.ativo) throw new ErroHttp(401, 'E-mail ou senha incorretos.');
 const token = jwt.sign({},config.secret,{ algorithm:'HS256',subject:String(u.id),issuer:config.issuer,audience:config.audience,expiresIn:config.ttl });
 res.json({ token, tipo:'Bearer', expiraEm:config.ttl });
};
