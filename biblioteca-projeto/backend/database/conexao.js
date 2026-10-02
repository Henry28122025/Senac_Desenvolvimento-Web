import mysql from "mysql2/promise";
import "dotenv/config";

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

async function testarConexao() {
    let conexaoTeste;
    try {
        conexaoTeste = await pool.getConnection();
        console.log('Conexão com o Banco bem-sucedida!');
    } catch (error) {
        console.error('Erro ao conectar ao Banco de Dados:', error.message);
        throw error;
    }finally{
        if(conexaoTeste){
            conexaoTeste.release();
        }
    }
}
export {pool, testarConexao};
