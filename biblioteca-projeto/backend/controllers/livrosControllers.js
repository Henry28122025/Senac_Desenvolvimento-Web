import { pool } from "../database/conexao.js";

async function listarLivros(req, res) {
    try {
        const [livros] = await pool.query("SELECT * FROM livros");
        res.status(200).json(livros);
    } catch (erro) {
        console.error("Erro ao buscar livros:", erro);
        res.status(500).json({ mensagem: "Erro ao buscar livros" });
    }
}

export { listarLivros };

//POST

async function cadastrarLivro(req, res) {
    try {
        const { titulo, autor, ano } = req.body;
        if (!titulo || !autor || !ano) {
            return res.status(400).json({ mensagem: "Todos os campos são obrigatórios" });
        }

        const [resultado] = await pool.query("INSERT INTO livros (titulo, autor, ano) VALUES (?, ?, ?)", [titulo, autor, ano]);
        res.status(201).json({ mensagem: "Livro cadastrado com sucesso", id: resultado.insertId });
    } catch (erro){
        console.error("Erro ao cadastrar livro:", erro);
        res.status(500).json({ mensagem: "Erro ao cadastrar livro" });
    }
}

export { cadastrarLivro };
