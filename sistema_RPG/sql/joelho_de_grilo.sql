-- Banco dedicado ao projeto. Não altera o banco da biblioteca.
CREATE DATABASE IF NOT EXISTS JOELHO_DE_GRILO
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE JOELHO_DE_GRILO;

CREATE TABLE IF NOT EXISTS comunidade (
  id INT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  descricao TEXT NOT NULL,
  endereco VARCHAR(200) NOT NULL,
  horario VARCHAR(150) NOT NULL,
  link_redes VARCHAR(500) NOT NULL
);

INSERT INTO comunidade (id, nome, descricao, endereco, horario, link_redes)
SELECT 1, 'Joelho de Grilo', 'RPG, jogos de tabuleiro e card games. A Taverna Joelho de Grilo é um ponto de encontro para quem gosta de jogar e compartilhar histórias, no centro de Santa Cruz do Sul.', 'Rua São José, 2313 · Santa Cruz do Sul, RS', 'Terça a domingo · 14h às 22h', 'https://linktr.ee/JOELHODEGRILO'
WHERE NOT EXISTS (SELECT 1 FROM comunidade WHERE id = 1);

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(180) NOT NULL,
  papel ENUM('membro', 'admin') NOT NULL DEFAULT 'membro',
  bio VARCHAR(300) NOT NULL DEFAULT '',
  sistema_preferido VARCHAR(60) NOT NULL DEFAULT 'Estou começando',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessoes (
  token_hash CHAR(64) PRIMARY KEY,
  usuario_id INT NOT NULL,
  expira_em DATETIME NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS publicacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  autor VARCHAR(80) NOT NULL,
  conteudo TEXT NOT NULL,
  categoria VARCHAR(40) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS eventos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(120) NOT NULL,
  descricao TEXT NOT NULL,
  categoria VARCHAR(40) NOT NULL,
  data_evento DATETIME NOT NULL,
  local VARCHAR(150) NOT NULL,
  vagas INT NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (vagas > 0)
);

CREATE TABLE IF NOT EXISTS inscricoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evento_id INT NOT NULL,
  nome VARCHAR(80) NOT NULL,
  usuario_id INT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY inscricao_usuario (evento_id, usuario_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS produtos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT NOT NULL,
  categoria VARCHAR(40) NOT NULL,
  preco DECIMAL(8,2) NOT NULL,
  estoque INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (preco > 0),
  CHECK (estoque >= 0)
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  email VARCHAR(150) NOT NULL,
  usuario_id INT NULL,
  total DECIMAL(12,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'demonstrativo',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX pedidos_email (email),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pedido_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  produto_id INT NULL,
  nome_produto VARCHAR(120) NOT NULL,
  quantidade INT NOT NULL,
  preco_unitario DECIMAL(8,2) NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL,
  CHECK (quantidade > 0)
);

-- Conteúdo fictício para a avaliação: não representa agenda, catálogo ou preços reais.
-- Os blocos verificam a tabela ou o nome do exemplo para evitar duplicatas.
INSERT INTO publicacoes (autor, conteudo, categoria)
SELECT 'Aventureiro de exemplo', 'Alguém começando no RPG por aqui? Estou procurando uma mesa para minha primeira aventura. Dados separados e vontade de jogar!', 'Procuro mesa'
WHERE NOT EXISTS (SELECT 1 FROM publicacoes);

INSERT INTO eventos (titulo, descricao, categoria, data_evento, local, vagas)
SELECT 'Uma noite em terras esquecidas', 'Evento de exemplo: uma aventura de RPG para iniciantes e veteranos. Traga a curiosidade; o resto a mesa constrói junto.', 'RPG', '2026-11-14 18:00:00', 'Taverna Joelho de Grilo', 6
WHERE NOT EXISTS (SELECT 1 FROM eventos);

INSERT INTO eventos (titulo, descricao, categoria, data_evento, local, vagas)
SELECT 'Domingo de tabuleiro', 'Evento de exemplo: descubra novos jogos de tabuleiro e conheça outros jogadores em uma tarde de partidas.', 'Board game', '2026-11-15 14:00:00', 'Taverna Joelho de Grilo', 16
WHERE NOT EXISTS (SELECT 1 FROM eventos WHERE titulo = 'Domingo de tabuleiro');

INSERT INTO eventos (titulo, descricao, categoria, data_evento, local, vagas)
SELECT 'Encontro de card games', 'Evento de exemplo: um encontro casual para trocar ideias, conhecer decks e jogar com a comunidade.', 'Card game', '2026-11-21 16:00:00', 'Taverna Joelho de Grilo', 12
WHERE NOT EXISTS (SELECT 1 FROM eventos WHERE titulo = 'Encontro de card games');

INSERT INTO produtos (nome, descricao, categoria, preco, estoque)
SELECT 'Kit de dados Aurora', 'Produto de exemplo: conjunto com sete dados para suas aventuras de RPG. Imagem e preço são ilustrativos.', 'Dados', 49.90, 20
WHERE NOT EXISTS (SELECT 1 FROM produtos);

INSERT INTO produtos (nome, descricao, categoria, preco, estoque)
SELECT 'Caderno do aventureiro', 'Produto de exemplo: um caderno para registrar personagens, mapas e histórias da sua campanha.', 'Acessórios', 34.90, 15
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Caderno do aventureiro');

INSERT INTO produtos (nome, descricao, categoria, preco, estoque)
SELECT 'Guia da primeira aventura', 'Produto de exemplo: livro introdutório de RPG para quem está preparando sua primeira mesa.', 'Livros', 89.90, 8
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Guia da primeira aventura');

INSERT INTO produtos (nome, descricao, categoria, preco, estoque)
SELECT 'Deck box da taverna', 'Produto de exemplo: caixa para guardar suas cartas entre uma partida e outra.', 'Card games', 39.90, 12
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome = 'Deck box da taverna');
