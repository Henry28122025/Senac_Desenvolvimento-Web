class ErroHttp extends Error { constructor(status, message) { super(message); this.status = status; } }
function tratarErro(err, req, res, next) {
 if (res.headersSent) return next(err);
 if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ mensagem: 'Este e-mail já está cadastrado.' });
 const status = err.status === 400 || err.status === 413 ? err.status : (err instanceof ErroHttp ? err.status : 500);
 res.status(status).json({ mensagem: status === 500 ? 'Não foi possível concluir. Tente novamente mais tarde.' :
  err instanceof ErroHttp ? err.message : 'Corpo da requisição inválido ou muito grande.' });
}
module.exports = { ErroHttp, tratarErro };
