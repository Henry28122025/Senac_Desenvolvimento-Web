import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

// Cada execução cria e remove exclusivamente seu próprio banco de teste.
export async function criarAmbienteTeste() {
  dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
  const banco = `JG_TEST_${process.pid}_${Date.now()}`;
  process.env.DB_NAME = banco;
  const administrador = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
    charset: "utf8mb4"
  });
  let servidor, pool;
  async function encerrar() {
    if (servidor) await new Promise(resolve => servidor.close(resolve));
    if (pool) await pool.end();
    await administrador.query(`DROP DATABASE IF EXISTS ${banco}`);
    await administrador.end();
  }
  try {
    const sql = (await readFile(new URL("../../sql/joelho_de_grilo.sql", import.meta.url), "utf8")).replaceAll("JOELHO_DE_GRILO", banco);
    await administrador.query(sql);
    ({ pool } = await import("../database/conexao.js"));
    const { app } = await import("../app.js");
    servidor = await new Promise(resolve => { const instancia = app.listen(0, "127.0.0.1", () => resolve(instancia)); });
    return { url: `http://127.0.0.1:${servidor.address().port}`, pool, banco, encerrar };
  } catch (erro) {
    await encerrar();
    throw erro;
  }
}
