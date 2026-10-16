import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";

// Resolve o .env pelo arquivo, mesmo quando o Node inicia em outra pasta.
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "JOELHO_DE_GRILO",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  decimalNumbers: true,
  charset: "utf8mb4",
  connectTimeout: 5000
});

// Mantém TIMESTAMP e expiração das sessões em UTC; eventos usam DATETIME local.
pool.pool.on("connection", conexao => conexao.query("SET time_zone = '+00:00'"));

async function testarConexao() {
  const conexao = await pool.getConnection();
  try {
    await conexao.query("SELECT 1");
  } finally {
    conexao.release();
  }
}

export { pool, testarConexao };
export default pool;
