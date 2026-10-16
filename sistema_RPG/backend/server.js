import { app } from "./app.js";
import { pool, testarConexao } from "./database/conexao.js";

async function iniciarServidor() {
  try {
    await testarConexao();
    const port = process.env.PORT || 3001;
    const servidor = app.listen(port, () => {
      console.log(`Joelho de Grilo disponível em http://localhost:${port}`);
      console.log("MySQL conectado. Compras demonstrativas, sem cobrança real.");
    });
    const encerrar = () => servidor.close(async () => {
      await pool.end();
      process.exit(0);
    });
    process.on("SIGINT", encerrar);
    process.on("SIGTERM", encerrar);
  } catch (erro) {
    console.error("Não foi possível iniciar o servidor:", erro.code || erro.message);
    console.error("Confira o .env e execute npm run db:setup antes de iniciar.");
    await pool.end();
    process.exitCode = 1;
  }
}

iniciarServidor();
