import { ErroHttp } from "../middlewares/errosMiddleware.js";

export function texto(valor, campo, tamanhoMaximo, minimo = 1) {
  if (typeof valor !== "string" || valor.trim().length < minimo || valor.trim().length > tamanhoMaximo) {
    throw new ErroHttp(400, `${campo} deve ter entre ${minimo} e ${tamanhoMaximo} caracteres.`);
  }
  return valor.trim();
}

export function inteiro(valor, campo, minimo = 1, maximo = 2147483647) {
  if (typeof valor !== "number" && typeof valor !== "string") throw new ErroHttp(400, `${campo} inválido.`);
  if (String(valor).trim() === "" || !Number.isSafeInteger(Number(valor)) || Number(valor) < minimo || Number(valor) > maximo) {
    throw new ErroHttp(400, `${campo} deve ser um número inteiro entre ${minimo} e ${maximo}.`);
  }
  return Number(valor);
}

export function idParametro(req) {
  return inteiro(req.params.id, "ID");
}

export function categoria(valor, permitidas) {
  if (!permitidas.includes(valor)) throw new ErroHttp(400, "Selecione uma categoria válida.");
  return valor;
}

export function emailValido(valor) {
  const email = texto(valor, "E-mail", 150).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErroHttp(400, "Informe um e-mail válido.");
  return email;
}

export function precoValido(valor) {
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(String(valor)) || Number(valor) < 0.01) {
    throw new ErroHttp(400, "Preço deve estar entre R$ 0,01 e R$ 999.999,99, com até duas casas decimais.");
  }
  return Number(valor);
}

export function dataValida(valor) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) {
    throw new ErroHttp(400, "Informe a data e a hora do evento.");
  }
  const [ano, mes, dia, hora, minuto] = valor.split(/[-T:]/).map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia, hora, minuto));
  if (ano < 2000 || ano > 2100 || data.toISOString().slice(0, 16) !== valor) {
    throw new ErroHttp(400, "Data do evento inválida.");
  }
  return valor.replace("T", " ") + ":00";
}
