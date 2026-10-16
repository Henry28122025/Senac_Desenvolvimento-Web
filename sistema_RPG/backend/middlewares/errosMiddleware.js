export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

export function tratarErros(erro, req, res, next) {
  if (erro.type === "entity.parse.failed") {
    return res.status(400).json({ mensagem: "Envie um JSON válido." });
  }
  if (erro.type === "entity.too.large") {
    return res.status(413).json({ mensagem: "O conteúdo enviado é muito grande." });
  }
  if (erro.status) return res.status(erro.status).json({ mensagem: erro.message });
  console.error("Erro na API:", erro.code || erro.message);
  res.status(500).json({ mensagem: "Não foi possível acessar o banco de dados. Tente novamente." });
}
