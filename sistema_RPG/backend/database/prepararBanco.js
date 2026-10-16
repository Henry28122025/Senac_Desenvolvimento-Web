import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { pool } from "./conexao.js";

let conexao;
try {
  const nomeBanco = process.env.DB_NAME || "JOELHO_DE_GRILO";
  if (!/^[A-Za-z0-9_]+$/.test(nomeBanco)) throw new Error("DB_NAME deve conter apenas letras, números e sublinhados.");
  const arquivo = new URL("../../sql/joelho_de_grilo.sql", import.meta.url);
  const sql = (await readFile(arquivo, "utf8")).replaceAll("JOELHO_DE_GRILO", nomeBanco);
  conexao = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
    charset: "utf8mb4"
  });
  await conexao.query(sql);
  const [camposUsuario] = await conexao.query("SHOW COLUMNS FROM usuarios");
  const novosCampos = {
    papel: "ENUM('membro', 'admin') NOT NULL DEFAULT 'membro'",
    bio: "VARCHAR(300) NOT NULL DEFAULT ''",
    sistema_preferido: "VARCHAR(60) NOT NULL DEFAULT 'Estou começando'"
  };
  for (const [nome, definicao] of Object.entries(novosCampos)) {
    if (!camposUsuario.some(campo => campo.Field === nome)) {
      await conexao.query(`ALTER TABLE usuarios ADD COLUMN ${nome} ${definicao}`);
    }
  }
  // Compatibilidade com a primeira estrutura criada durante o desenvolvimento.
  for (const tabela of ["publicacoes", "inscricoes", "pedidos"]) {
    const [colunas] = await conexao.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'usuario_id'", [nomeBanco, tabela]);
    if (!colunas.length) {
      await conexao.query(`ALTER TABLE ${tabela} ADD COLUMN usuario_id INT NULL, ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE ${tabela === "pedidos" ? "SET NULL" : "CASCADE"}`);
    }
  }
  const [indices] = await conexao.query("SHOW INDEX FROM inscricoes");
  if (indices.some(indice => indice.Key_name === "inscricao_unica")) await conexao.query("ALTER TABLE inscricoes DROP INDEX inscricao_unica, ADD UNIQUE KEY inscricao_usuario (evento_id, usuario_id)");
  console.log(`Banco ${nomeBanco} preparado. Tabelas e exemplos disponíveis.`);
} catch (erro) {
  console.error("Não foi possível preparar o banco:", erro.code || erro.message);
  process.exitCode = 1;
} finally {
  if (conexao) await conexao.end();
  await pool.end();
}
