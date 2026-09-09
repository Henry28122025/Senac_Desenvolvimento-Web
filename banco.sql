-- ==================== CRIACAO DO BANCO ====================
DROP DATABASE IF EXISTS sistema_cursos;
CREATE DATABASE sistema_cursos
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
USE sistema_cursos;

-- ==================== CRIACAO DAS TABELAS ====================
CREATE TABLE alunos (
    id_aluno INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    data_nascimento DATE NOT NULL
);

CREATE TABLE cursos (
    id_curso INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    carga_horaria INT NOT NULL,
    professor VARCHAR(100) NOT NULL,
    CHECK (carga_horaria > 0)
);

CREATE TABLE matriculas (
    id_matricula INT PRIMARY KEY AUTO_INCREMENT,
    data_matricula DATE NOT NULL,
    status ENUM('Ativa', 'Concluida', 'Cancelada') NOT NULL DEFAULT 'Ativa',
    fk_aluno INT NOT NULL,
    fk_curso INT NOT NULL,
    UNIQUE (fk_aluno, fk_curso),
    FOREIGN KEY (fk_aluno) REFERENCES alunos(id_aluno)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    FOREIGN KEY (fk_curso) REFERENCES cursos(id_curso)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- ==================== DADOS PARA TESTES ====================
INSERT INTO alunos (nome, email, data_nascimento) VALUES
('Ana Souza', 'ana.souza@email.com', '2004-03-15'),
('Bruno Lima', 'bruno.lima@email.com', '2003-08-22'),
('Carla Mendes', 'carla.mendes@email.com', '2005-01-10'),
('Diego Alves', 'diego.alves@email.com', '2002-11-05');

INSERT INTO cursos (nome, carga_horaria, professor) VALUES
('Desenvolvimento Web', 80, 'Marcos Silva'),
('Banco de Dados', 60, 'Juliana Costa'),
('Logica de Programacao', 40, 'Pedro Santos'),
('Redes de Computadores', 50, 'Fernanda Oliveira');

INSERT INTO matriculas (data_matricula, status, fk_aluno, fk_curso) VALUES
('2026-08-01', 'Ativa', 1, 1),
('2026-08-02', 'Concluida', 1, 2),
	

-- O aluno 4 e o curso 4 nao possuem matriculas e podem ser usados no teste de DELETE.

-- ==================== CONSULTAS SIMPLES ====================
SELECT * FROM alunos;
SELECT * FROM cursos;
SELECT * FROM matriculas;

-- ==================== CONSULTAS COM INNER JOIN ====================
SELECT
    matriculas.id_matricula,
    alunos.nome AS aluno,
    cursos.nome AS curso,
    matriculas.data_matricula,
    matriculas.status
FROM matriculas
INNER JOIN alunos ON matriculas.fk_aluno = alunos.id_aluno
INNER JOIN cursos ON matriculas.fk_curso = cursos.id_curso;

SELECT
    cursos.nome AS curso,
    cursos.carga_horaria,
    cursos.professor,
    alunos.nome AS aluno,
    alunos.email,
    matriculas.status
FROM cursos
INNER JOIN matriculas ON cursos.id_curso = matriculas.fk_curso
INNER JOIN alunos ON matriculas.fk_aluno = alunos.id_aluno
ORDER BY cursos.nome, alunos.nome;
