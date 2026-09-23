import { pool } from "../database/conexao.js";

async function listarLivros(req, res) {
    try {
        const [livros] = await pool.query("SELECT * FROM livros");
        res.status(200).json(livros);
    } catch {
        console.error("Erro ao buscar livros:", erro);
        res.status(500).json({ mensagem: "Erro ao buscar livros" });
    }
}

export { listarLivros };
