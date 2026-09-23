import express from 'express';
import mysql from 'mysql2/promise';

const app = express();
const port = 3000;

app.use(express.json()); // Permite receber dados no formato JSON.

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'sistema_cursos',
    waitForConnections: true,
    connectionLimit: 10
});

async function testarConexao() {
    try {
        const conexaoTeste = await pool.getConnection();
        conexaoTeste.release();
        console.log('Conexão com o Banco bem-sucedida!');
    } catch (error) {
        console.error('Erro ao conectar ao Banco de Dados:', error.message);
        process.exit(1);
    }
}

app.get('/', (req, res) => {
    res.send('API do Sistema de Cursos funcionando');
});

// Cadastro de alunos
app.get('/alunos', async (req, res) => {
    try {
        const [linhas] = await pool.query(
            'SELECT * FROM alunos'
        );
        return res.json(linhas);
    } catch (error) {
        console.error('Erro ao buscar aluno:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.get('/alunos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [linhas] = await pool.query(
            'SELECT * FROM alunos WHERE id_aluno = ?',
            [id]
        );
        if (!linhas[0]) {
            return res.status(404).json({ mensagem: 'Aluno não encontrado' });
        }
        return res.json(linhas[0]);
    } catch (error) {
        console.error('Erro ao buscar aluno:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.post('/alunos', async (req, res) => {
    const { nome, email, data_nascimento } = req.body || {};
    if (!nome || !email || !data_nascimento) {
        return res.status(400).json({
            mensagem: 'Informe nome, email, data_nascimento'
        });
    }
    try {
        const [resultado] = await pool.query(
            'INSERT INTO alunos (nome, email, data_nascimento) VALUES (?, ?, ?)',
            [nome, email, data_nascimento]
        );
        return res.status(201).json({
            id_aluno: resultado.insertId, nome, email, data_nascimento
        });
    } catch (error) {
        console.error('Erro ao criar aluno:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.put('/alunos/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, email, data_nascimento } = req.body || {};
    if (!nome || !email || !data_nascimento) {
        return res.status(400).json({
            mensagem: 'Informe nome, email, data_nascimento'
        });
    }
    try {
        const [resultado] = await pool.query(
            'UPDATE alunos SET nome = ?, email = ?, data_nascimento = ? WHERE id_aluno = ?',
            [nome, email, data_nascimento, id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Aluno não encontrado' });
        }
        return res.status(200).json({
            id_aluno: id, nome, email, data_nascimento
        });
    } catch (error) {
        console.error('Erro ao atualizar aluno:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.delete('/alunos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [resultado] = await pool.query(
            'DELETE FROM alunos WHERE id_aluno = ?',
            [id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Aluno não encontrado' });
        }
        return res.status(200).json({ mensagem: 'Aluno removido com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar aluno:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});


// Cadastro de cursos
app.get('/cursos', async (req, res) => {
    try {
        const [linhas] = await pool.query(
            'SELECT * FROM cursos'
        );
        return res.json(linhas);
    } catch (error) {
        console.error('Erro ao buscar curso:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.get('/cursos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [linhas] = await pool.query(
            'SELECT * FROM cursos WHERE id_curso = ?',
            [id]
        );
        if (!linhas[0]) {
            return res.status(404).json({ mensagem: 'Curso não encontrado' });
        }
        return res.json(linhas[0]);
    } catch (error) {
        console.error('Erro ao buscar curso:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.post('/cursos', async (req, res) => {
    const { nome, carga_horaria, professor } = req.body || {};
    if (!nome || !carga_horaria || !professor) {
        return res.status(400).json({
            mensagem: 'Informe nome, carga_horaria, professor'
        });
    }
    try {
        const [resultado] = await pool.query(
            'INSERT INTO cursos (nome, carga_horaria, professor) VALUES (?, ?, ?)',
            [nome, carga_horaria, professor]
        );
        return res.status(201).json({
            id_curso: resultado.insertId, nome, carga_horaria, professor
        });
    } catch (error) {
        console.error('Erro ao criar curso:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.put('/cursos/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, carga_horaria, professor } = req.body || {};
    if (!nome || !carga_horaria || !professor) {
        return res.status(400).json({
            mensagem: 'Informe nome, carga_horaria, professor'
        });
    }
    try {
        const [resultado] = await pool.query(
            'UPDATE cursos SET nome = ?, carga_horaria = ?, professor = ? WHERE id_curso = ?',
            [nome, carga_horaria, professor, id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Curso não encontrado' });
        }
        return res.status(200).json({
            id_curso: id, nome, carga_horaria, professor
        });
    } catch (error) {
        console.error('Erro ao atualizar curso:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.delete('/cursos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [resultado] = await pool.query(
            'DELETE FROM cursos WHERE id_curso = ?',
            [id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Curso não encontrado' });
        }
        return res.status(200).json({ mensagem: 'Curso removido com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar curso:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});


// Cadastro de matriculas
app.get('/matriculas', async (req, res) => {
    try {
        const [linhas] = await pool.query(
            'SELECT * FROM matriculas'
        );
        return res.json(linhas);
    } catch (error) {
        console.error('Erro ao buscar matrícula:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.get('/matriculas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [linhas] = await pool.query(
            'SELECT * FROM matriculas WHERE id_matricula = ?',
            [id]
        );
        if (!linhas[0]) {
            return res.status(404).json({ mensagem: 'Matrícula não encontrada' });
        }
        return res.json(linhas[0]);
    } catch (error) {
        console.error('Erro ao buscar matrícula:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.post('/matriculas', async (req, res) => {
    const { data_matricula, status, fk_aluno, fk_curso } = req.body || {};
    if (!data_matricula || !status || !fk_aluno || !fk_curso) {
        return res.status(400).json({
            mensagem: 'Informe data_matricula, status, fk_aluno, fk_curso'
        });
    }
    try {
        const [resultado] = await pool.query(
            'INSERT INTO matriculas (data_matricula, status, fk_aluno, fk_curso) VALUES (?, ?, ?, ?)',
            [data_matricula, status, fk_aluno, fk_curso]
        );
        return res.status(201).json({
            id_matricula: resultado.insertId, data_matricula, status, fk_aluno, fk_curso
        });
    } catch (error) {
        console.error('Erro ao criar matrícula:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.put('/matriculas/:id', async (req, res) => {
    const { id } = req.params;
    const { data_matricula, status, fk_aluno, fk_curso } = req.body || {};
    if (!data_matricula || !status || !fk_aluno || !fk_curso) {
        return res.status(400).json({
            mensagem: 'Informe data_matricula, status, fk_aluno, fk_curso'
        });
    }
    try {
        const [resultado] = await pool.query(
            'UPDATE matriculas SET data_matricula = ?, status = ?, fk_aluno = ?, fk_curso = ? WHERE id_matricula = ?',
            [data_matricula, status, fk_aluno, fk_curso, id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Matrícula não encontrada' });
        }
        return res.status(200).json({
            id_matricula: id, data_matricula, status, fk_aluno, fk_curso
        });
    } catch (error) {
        console.error('Erro ao atualizar matrícula:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.delete('/matriculas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [resultado] = await pool.query(
            'DELETE FROM matriculas WHERE id_matricula = ?',
            [id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Matrícula não encontrada' });
        }
        return res.status(200).json({ mensagem: 'Matrícula removida com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar matrícula:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

// INNER JOIN junta as tabelas. AS dá um nome ao campo no resultado.
app.get('/relatorios/matriculas', async (req, res) => {
    try {
        const [linhas] = await pool.query(`
            SELECT matriculas.id_matricula, matriculas.data_matricula,
                   matriculas.status, alunos.id_aluno, alunos.nome AS aluno,
                   alunos.email AS email_aluno, cursos.id_curso,
                   cursos.nome AS curso, cursos.carga_horaria, cursos.professor
            FROM matriculas
            INNER JOIN alunos ON matriculas.fk_aluno = alunos.id_aluno
            INNER JOIN cursos ON matriculas.fk_curso = cursos.id_curso
        `);
        return res.json(linhas);
    } catch (error) {
        console.error('Erro ao buscar relatório de matrículas:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.get('/relatorios/alunos-por-curso', async (req, res) => {
    try {
        const [linhas] = await pool.query(`
            SELECT cursos.nome AS curso, cursos.carga_horaria,
                   cursos.professor, alunos.nome AS aluno,
                   alunos.email, matriculas.status
            FROM cursos
            INNER JOIN matriculas ON cursos.id_curso = matriculas.fk_curso
            INNER JOIN alunos ON matriculas.fk_aluno = alunos.id_aluno
            ORDER BY cursos.nome, alunos.nome
        `);
        return res.json(linhas);
    } catch (error) {
        console.error('Erro ao buscar alunos por curso:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.listen(port, async () => {
    await testarConexao();
    console.log(`Servidor rodando em http://localhost:${port}`);
});
