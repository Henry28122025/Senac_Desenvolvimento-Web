const { ErroHttp } = require('./errosMiddleware');
module.exports = (...perfis) => (req,res,next) => {
 if (!req.usuario) throw new ErroHttp(401,'Autenticação necessária.');
 if (!perfis.includes(req.usuario.perfil)) throw new ErroHttp(403,'Seu perfil não permite esta ação.');
 next();
};
