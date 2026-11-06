const { ErroHttp } = require('../middlewares/errosMiddleware');
function texto(v, campo, min, max) {
 if (typeof v !== 'string' || v.trim().length < min || v.trim().length > max) throw new ErroHttp(400, `${campo}: informe entre ${min} e ${max} caracteres.`);
 return v.trim();
}
function credenciais(body) {
 if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ErroHttp(400, 'Informe os dados.');
 const email = texto(body.email, 'E-mail', 3, 254).toLowerCase();
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErroHttp(400, 'E-mail inválido.');
 if (typeof body.senha !== 'string' || body.senha.length < 12 || body.senha.length > 128) throw new ErroHttp(400, 'Senha: use de 12 a 128 caracteres.');
 return { email, senha: body.senha };
}
function cadastro(body) {
 const dados = credenciais(body);
 const permitidos = ['nome','email','senha','perfil','organizacao'];
 if (Object.keys(body).some(k => !permitidos.includes(k))) throw new ErroHttp(400, 'Campo não permitido no cadastro.');
 if (!['contratante','transportadora'].includes(body.perfil)) throw new ErroHttp(400, 'Escolha contratante ou transportadora.');
 return { ...dados, nome: texto(body.nome,'Nome',2,100), organizacao: texto(body.organizacao,'Organização',2,150), perfil: body.perfil };
}
module.exports = { texto, credenciais, cadastro };
