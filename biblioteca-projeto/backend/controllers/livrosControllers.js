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

async function buscarLivroPorId(req, res) {
    try{
        const id = req.params.id;
        const [livros] = await pool.query("SELECT * FROM livros WHERE id = ?", [id]);
        if (livros.length === 0) {
            return res.status(404).json({ mensagem: "Livro não encontrado" });
        }
        res.status(200).json(livros[0]);
    }catch (erro) {
        console.log("Erro ao buscar livro:", erro);
        res.status(500).json({ mensagem: "Erro ao buscar livro" });
    }
}

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

async function atualizarLivro(req, res) {
    try{
        const id = req.params.id;
        const { titulo, autor, ano } = req.body;
        if (!titulo || !autor || !ano) {
            return res.status(400).json({ mensagem: "Todos os campos são obrigatórios" });
        }

        const [resultado] = await pool.query(
            "UPDATE livros SET titulo = ?, autor = ?, ano = ? WHERE id = ?", [titulo, autor, ano, id]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: "Livro não encontrado" });
        }

        res.status(200).json({ mensagem: "Livro atualizado com sucesso" });
    }catch (erro) {
        console.error("Erro ao atualizar livro:", erro);
        res.status(500).json({ mensagem: "Erro ao atualizar livro" });
    }
}

export { cadastrarLivro, atualizarLivro, listarLivros, buscarLivroPorId };
