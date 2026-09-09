import express from 'express';
import mysql from 'mysql2/promise';

const app = express();
const LIMITE_INT_MYSQL = 2147483647;
const porta = obterPorta(process.env.PORT, 3000);

app.use(express.json());

// ==================== CONEXÃO COM O BANCO DE DADOS ====================
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: obterPorta(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? 'admin',
    database: process.env.DB_NAME || 'sistema_cursos',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true
});

async function testarConexao() {
    let conexaoTeste;

    try {
        conexaoTeste = await pool.getConnection();
        await conexaoTeste.query('SELECT 1');
        console.log('Conexão com o Banco de Dados bem-sucedida!');
    } finally {
        if (conexaoTeste) {
            conexaoTeste.release();
        }
    }
}

function obterId(valor) {
    if (typeof valor === 'number') {
        return Number.isSafeInteger(valor) && valor > 0 && valor <= LIMITE_INT_MYSQL
            ? valor
            : null;
    }

    if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor)) {
        return null;
    }

    const id = Number(valor);
    return Number.isSafeInteger(id) && id <= LIMITE_INT_MYSQL ? id : null;
}

function obterPorta(valor, portaPadrao) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero >= 1 && numero <= 65535
        ? numero
        : portaPadrao;
}

function textoValido(valor, tamanhoMaximo) {
    return typeof valor === 'string'
        && valor.trim().length > 0
        && valor.trim().length <= tamanhoMaximo;
}

function statusValido(status) {
    return ['Ativa', 'Concluida', 'Cancelada'].includes(status);
}

function emailValido(email) {
    return textoValido(email, 150) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function dataValida(data) {
    if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return false;
    }

    const dataCriada = new Date(`${data}T00:00:00Z`);
    const ano = Number(data.slice(0, 4));

    return ano >= 1000
        && !Number.isNaN(dataCriada.getTime())
        && dataCriada.toISOString().slice(0, 10) === data;
}

function erroDeDuplicidade(error) {
    return error.code === 'ER_DUP_ENTRY';
}

function erroDeReferenciaInexistente(error) {
    return error.code === 'ER_NO_REFERENCED_ROW_2';
}

function erroDeRegistroRelacionado(error) {
    return error.code === 'ER_ROW_IS_REFERENCED_2';
}

app.get('/', (req, res) => {
    return res.json({
        mensagem: 'API do Sistema de Cursos funcionando',
        recursos: ['/alunos', '/cursos', '/matriculas'],
        relatorios: [
            '/relatorios/matriculas',
            '/relatorios/alunos-por-curso'
        ]
    });
});

// ==================== RELATÓRIOS COM INNER JOIN ====================
app.get('/relatorios/matriculas', async (req, res) => {
    try {
        const [linhas] = await pool.query(`
            SELECT
                m.id_matricula,
                m.data_matricula,
                m.status,
                a.id_aluno,
                a.nome AS aluno,
                a.email AS email_aluno,
                c.id_curso,
                c.nome AS curso,
                c.carga_horaria,
                c.professor
            FROM matriculas m
            INNER JOIN alunos a ON m.fk_aluno = a.id_aluno
            INNER JOIN cursos c ON m.fk_curso = c.id_curso
            ORDER BY m.id_matricula
        `);

        return res.json(linhas);
    } catch (error) {
        console.error('Erro ao gerar relatório de matrículas:', error.message);
        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao gerar relatório de matrículas'
        });
    }
});

app.get('/relatorios/alunos-por-curso', async (req, res) => {
    try {
        const [linhas] = await pool.query(`
            SELECT
                c.nome AS curso,
                c.carga_horaria,
                c.professor,
                a.nome AS aluno,
                a.email,
                m.status
            FROM cursos c
            INNER JOIN matriculas m ON c.id_curso = m.fk_curso
            INNER JOIN alunos a ON m.fk_aluno = a.id_aluno
            ORDER BY c.nome, a.nome
        `);

        return res.json(linhas);
    } catch (error) {
        console.error('Erro ao gerar relatório de alunos por curso:', error.message);
        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao gerar relatório de alunos por curso'
        });
    }
});

// ==================== CRUD DE ALUNOS ====================
app.get('/alunos', async (req, res) => {
    try {
        const [linhas] = await pool.query('SELECT * FROM alunos ORDER BY id_aluno');
        return res.json(linhas);
    } catch (error) {
        console.error('Erro ao buscar alunos:', error.message);
        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao buscar alunos'
        });
    }
});

app.get('/alunos/:id', async (req, res) => {
    const id = obterId(req.params.id);

    if (!id) {
        return res.status(400).json({ mensagem: 'ID do aluno inválido' });
    }

    try {
        const [linhas] = await pool.query(
            'SELECT * FROM alunos WHERE id_aluno = ?',
            [id]
        );

        if (linhas.length === 0) {
            return res.status(404).json({ mensagem: 'Aluno não encontrado' });
        }

        return res.json(linhas[0]);
    } catch (error) {
        console.error('Erro ao buscar aluno:', error.message);
        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao buscar aluno'
        });
    }
});

app.post('/alunos', async (req, res) => {
    const { nome, email, data_nascimento } = req.body || {};

    if (!textoValido(nome, 100) || !emailValido(email) || !dataValida(data_nascimento)) {
        return res.status(400).json({
            mensagem: 'Informe nome, email válido e data_nascimento no formato AAAA-MM-DD'
        });
    }

    const aluno = {
        nome: nome.trim(),
        email: email.trim(),
        data_nascimento
    };

    try {
        const [resultado] = await pool.query(
            'INSERT INTO alunos (nome, email, data_nascimento) VALUES (?, ?, ?)',
            [aluno.nome, aluno.email, aluno.data_nascimento]
        );

        return res.status(201).json({
            id_aluno: resultado.insertId,
            ...aluno
        });
    } catch (error) {
        console.error('Erro ao criar aluno:', error.message);

        if (erroDeDuplicidade(error)) {
            return res.status(409).json({ mensagem: 'Já existe um aluno com esse email' });
        }

        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao criar aluno'
        });
    }
});

app.put('/alunos/:id', async (req, res) => {
    const id = obterId(req.params.id);
    const { nome, email, data_nascimento } = req.body || {};

    if (!id) {
        return res.status(400).json({ mensagem: 'ID do aluno inválido' });
    }

    if (!textoValido(nome, 100) || !emailValido(email) || !dataValida(data_nascimento)) {
        return res.status(400).json({
            mensagem: 'Informe nome, email válido e data_nascimento no formato AAAA-MM-DD'
        });
    }

    const aluno = {
        nome: nome.trim(),
        email: email.trim(),
        data_nascimento
    };

    try {
        const [resultado] = await pool.query(
            `UPDATE alunos
             SET nome = ?, email = ?, data_nascimento = ?
             WHERE id_aluno = ?`,
            [aluno.nome, aluno.email, aluno.data_nascimento, id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Aluno não encontrado' });
        }

        return res.json({ id_aluno: id, ...aluno });
    } catch (error) {
        console.error('Erro ao atualizar aluno:', error.message);

        if (erroDeDuplicidade(error)) {
            return res.status(409).json({ mensagem: 'Já existe um aluno com esse email' });
        }

        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao atualizar aluno'
        });
    }
});

app.delete('/alunos/:id', async (req, res) => {
    const id = obterId(req.params.id);

    if (!id) {
        return res.status(400).json({ mensagem: 'ID do aluno inválido' });
    }

    try {
        const [resultado] = await pool.query(
            'DELETE FROM alunos WHERE id_aluno = ?',
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Aluno não encontrado' });
        }

        return res.json({ mensagem: 'Aluno removido com sucesso' });
    } catch (error) {
        console.error('Erro ao remover aluno:', error.message);

        if (erroDeRegistroRelacionado(error)) {
            return res.status(409).json({
                mensagem: 'O aluno possui matrículas e não pode ser removido'
            });
        }

        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao remover aluno'
        });
    }
});

// ==================== CRUD DE CURSOS ====================
app.get('/cursos', async (req, res) => {
    try {
        const [linhas] = await pool.query('SELECT * FROM cursos ORDER BY id_curso');
        return res.json(linhas);
    } catch (error) {
        console.error('Erro ao buscar cursos:', error.message);
        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao buscar cursos'
        });
    }
});

app.get('/cursos/:id', async (req, res) => {
    const id = obterId(req.params.id);

    if (!id) {
        return res.status(400).json({ mensagem: 'ID do curso inválido' });
    }

    try {
        const [linhas] = await pool.query(
            'SELECT * FROM cursos WHERE id_curso = ?',
            [id]
        );

        if (linhas.length === 0) {
            return res.status(404).json({ mensagem: 'Curso não encontrado' });
        }

        return res.json(linhas[0]);
    } catch (error) {
        console.error('Erro ao buscar curso:', error.message);
        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao buscar curso'
        });
    }
});

app.post('/cursos', async (req, res) => {
    const { nome, carga_horaria, professor } = req.body || {};
    const cargaHoraria = typeof carga_horaria === 'number' ? carga_horaria : NaN;

    if (
        !textoValido(nome, 100)
        || !Number.isSafeInteger(cargaHoraria)
        || cargaHoraria <= 0
        || cargaHoraria > LIMITE_INT_MYSQL
        || !textoValido(professor, 100)
    ) {
        return res.status(400).json({
            mensagem: 'Informe nome, carga_horaria inteira e positiva e professor'
        });
    }

    const curso = {
        nome: nome.trim(),
        carga_horaria: cargaHoraria,
        professor: professor.trim()
    };

    try {
        const [resultado] = await pool.query(
            'INSERT INTO cursos (nome, carga_horaria, professor) VALUES (?, ?, ?)',
            [curso.nome, curso.carga_horaria, curso.professor]
        );

        return res.status(201).json({
            id_curso: resultado.insertId,
            ...curso
        });
    } catch (error) {
        console.error('Erro ao criar curso:', error.message);

        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao criar curso'
        });
    }
});

app.put('/cursos/:id', async (req, res) => {
    const id = obterId(req.params.id);
    const { nome, carga_horaria, professor } = req.body || {};
    const cargaHoraria = typeof carga_horaria === 'number' ? carga_horaria : NaN;

    if (!id) {
        return res.status(400).json({ mensagem: 'ID do curso inválido' });
    }

    if (
        !textoValido(nome, 100)
        || !Number.isSafeInteger(cargaHoraria)
        || cargaHoraria <= 0
        || cargaHoraria > LIMITE_INT_MYSQL
        || !textoValido(professor, 100)
    ) {
        return res.status(400).json({
            mensagem: 'Informe nome, carga_horaria inteira e positiva e professor'
        });
    }

    const curso = {
        nome: nome.trim(),
        carga_horaria: cargaHoraria,
        professor: professor.trim()
    };

    try {
        const [resultado] = await pool.query(
            `UPDATE cursos
             SET nome = ?, carga_horaria = ?, professor = ?
             WHERE id_curso = ?`,
            [curso.nome, curso.carga_horaria, curso.professor, id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Curso não encontrado' });
        }

        return res.json({ id_curso: id, ...curso });
    } catch (error) {
        console.error('Erro ao atualizar curso:', error.message);

        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao atualizar curso'
        });
    }
});

app.delete('/cursos/:id', async (req, res) => {
    const id = obterId(req.params.id);

    if (!id) {
        return res.status(400).json({ mensagem: 'ID do curso inválido' });
    }

    try {
        const [resultado] = await pool.query(
            'DELETE FROM cursos WHERE id_curso = ?',
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Curso não encontrado' });
        }

        return res.json({ mensagem: 'Curso removido com sucesso' });
    } catch (error) {
        console.error('Erro ao remover curso:', error.message);

        if (erroDeRegistroRelacionado(error)) {
            return res.status(409).json({
                mensagem: 'O curso possui matrículas e não pode ser removido'
            });
        }

        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao remover curso'
        });
    }
});

// ==================== CRUD DE MATRÍCULAS ====================
app.get('/matriculas', async (req, res) => {
    try {
        const [linhas] = await pool.query('SELECT * FROM matriculas ORDER BY id_matricula');
        return res.json(linhas);
    } catch (error) {
        console.error('Erro ao buscar matrículas:', error.message);
        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao buscar matrículas'
        });
    }
});

app.get('/matriculas/:id', async (req, res) => {
    const id = obterId(req.params.id);

    if (!id) {
        return res.status(400).json({ mensagem: 'ID da matrícula inválido' });
    }

    try {
        const [linhas] = await pool.query(
            'SELECT * FROM matriculas WHERE id_matricula = ?',
            [id]
        );

        if (linhas.length === 0) {
            return res.status(404).json({ mensagem: 'Matrícula não encontrada' });
        }

        return res.json(linhas[0]);
    } catch (error) {
        console.error('Erro ao buscar matrícula:', error.message);
        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao buscar matrícula'
        });
    }
});

app.post('/matriculas', async (req, res) => {
    const { data_matricula, status, fk_aluno, fk_curso } = req.body || {};
    const idAluno = obterId(fk_aluno);
    const idCurso = obterId(fk_curso);
    const statusMatricula = typeof status === 'string' ? status.trim() : status;

    if (!dataValida(data_matricula) || !statusValido(statusMatricula) || !idAluno || !idCurso) {
        return res.status(400).json({
            mensagem: 'Informe data_matricula no formato AAAA-MM-DD, status (Ativa, Concluida ou Cancelada), fk_aluno e fk_curso válidos'
        });
    }

    const matricula = {
        data_matricula,
        status: statusMatricula,
        fk_aluno: idAluno,
        fk_curso: idCurso
    };

    try {
        const [resultado] = await pool.query(
            `INSERT INTO matriculas (data_matricula, status, fk_aluno, fk_curso)
             VALUES (?, ?, ?, ?)`,
            [
                matricula.data_matricula,
                matricula.status,
                matricula.fk_aluno,
                matricula.fk_curso
            ]
        );

        return res.status(201).json({
            id_matricula: resultado.insertId,
            ...matricula
        });
    } catch (error) {
        console.error('Erro ao criar matrícula:', error.message);

        if (erroDeDuplicidade(error)) {
            return res.status(409).json({
                mensagem: 'Este aluno já possui matrícula nesse curso'
            });
        }

        if (erroDeReferenciaInexistente(error)) {
            return res.status(409).json({
                mensagem: 'O aluno ou curso informado não existe'
            });
        }

        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao criar matrícula'
        });
    }
});

app.put('/matriculas/:id', async (req, res) => {
    const id = obterId(req.params.id);
    const { data_matricula, status, fk_aluno, fk_curso } = req.body || {};
    const idAluno = obterId(fk_aluno);
    const idCurso = obterId(fk_curso);
    const statusMatricula = typeof status === 'string' ? status.trim() : status;

    if (!id) {
        return res.status(400).json({ mensagem: 'ID da matrícula inválido' });
    }

    if (!dataValida(data_matricula) || !statusValido(statusMatricula) || !idAluno || !idCurso) {
        return res.status(400).json({
            mensagem: 'Informe data_matricula no formato AAAA-MM-DD, status (Ativa, Concluida ou Cancelada), fk_aluno e fk_curso válidos'
        });
    }

    const matricula = {
        data_matricula,
        status: statusMatricula,
        fk_aluno: idAluno,
        fk_curso: idCurso
    };

    try {
        const [resultado] = await pool.query(
            `UPDATE matriculas
             SET data_matricula = ?, status = ?, fk_aluno = ?, fk_curso = ?
             WHERE id_matricula = ?`,
            [
                matricula.data_matricula,
                matricula.status,
                matricula.fk_aluno,
                matricula.fk_curso,
                id
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Matrícula não encontrada' });
        }

        return res.json({ id_matricula: id, ...matricula });
    } catch (error) {
        console.error('Erro ao atualizar matrícula:', error.message);

        if (erroDeDuplicidade(error)) {
            return res.status(409).json({
                mensagem: 'Este aluno já possui matrícula nesse curso'
            });
        }

        if (erroDeReferenciaInexistente(error)) {
            return res.status(409).json({
                mensagem: 'O aluno ou curso informado não existe'
            });
        }

        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao atualizar matrícula'
        });
    }
});

app.delete('/matriculas/:id', async (req, res) => {
    const id = obterId(req.params.id);

    if (!id) {
        return res.status(400).json({ mensagem: 'ID da matrícula inválido' });
    }

    try {
        const [resultado] = await pool.query(
            'DELETE FROM matriculas WHERE id_matricula = ?',
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Matrícula não encontrada' });
        }

        return res.json({ mensagem: 'Matrícula removida com sucesso' });
    } catch (error) {
        console.error('Erro ao remover matrícula:', error.message);

        return res.status(500).json({
            mensagem: 'Erro interno no servidor ao remover matrícula'
        });
    }
});

// ==================== ERROS E INICIALIZAÇÃO DO SERVIDOR ====================
app.use((req, res) => {
    return res.status(404).json({ mensagem: 'Rota não encontrada' });
});

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({ mensagem: 'O JSON enviado é inválido' });
    }

    console.error('Erro não tratado:', error.message);
    return res.status(500).json({ mensagem: 'Erro interno no servidor' });
});

async function iniciarServidor() {
    try {
        await testarConexao();

        const servidor = app.listen(porta, () => {
            console.log(`Servidor rodando em http://localhost:${porta}`);
        });

        servidor.on('error', (erro) => {
            console.error('Erro ao iniciar o servidor:', erro.message);
            process.exit(1);
        });
    } catch (error) {
        console.error('Erro ao conectar ao Banco de Dados:', error.message);
        process.exit(1);
    }
}

iniciarServidor();
