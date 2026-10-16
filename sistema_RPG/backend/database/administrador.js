import { pool } from "./conexao.js";
import { emailValido } from "../controllers/validacoes.js";

// A alteração de permissão existe apenas no terminal do responsável pelo projeto.
try {
  const email = emailValido(process.argv[2]);
  const opcao = process.argv[3];
  if (opcao && opcao !== "--remover") throw new Error("Opção desconhecida. Use --remover para retirar o acesso de administrador.");
  const papel = opcao === "--remover" ? "membro" : "admin";
  const [usuarios] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [email]);
  if (!usuarios.length) throw new Error("Conta não encontrada. Cadastre esse e-mail pela interface primeiro.");
  await pool.query("UPDATE usuarios SET papel = ? WHERE id = ?", [papel, usuarios[0].id]);
  console.log(`Permissão atualizada para ${papel}. Atualize a página do navegador.`);
} catch (erro) {
  console.error(erro.code || erro.message);
  console.error("Uso: npm run admin -- seu-email@exemplo.com [--remover]");
  process.exitCode = 1;
} finally {
  await pool.end();
}
