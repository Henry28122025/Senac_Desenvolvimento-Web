-- MySQL 8.0.16+ (CHECK constraints), InnoDB. Não apaga dados existentes.
CREATE DATABASE IF NOT EXISTS entrega_radar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE entrega_radar;

CREATE TABLE IF NOT EXISTS empresas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS transportadoras (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    servicos TEXT,
    regioes TEXT,
    tipos_material TEXT,
    disponivel BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil ENUM('contratante', 'transportadora', 'administrador') NOT NULL,
    empresa_id INT UNSIGNED NULL,
    transportadora_id INT UNSIGNED NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas (id),
    FOREIGN KEY (transportadora_id) REFERENCES transportadoras (id),
    CONSTRAINT ck_usuario_vinculo CHECK (
        (
            perfil = 'contratante'
            AND empresa_id IS NOT NULL
            AND transportadora_id IS NULL
        )
        OR (
            perfil = 'transportadora'
            AND empresa_id IS NULL
            AND transportadora_id IS NOT NULL
        )
        OR (
            perfil = 'administrador'
            AND empresa_id IS NULL
            AND transportadora_id IS NULL
        )
    )
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS pedidos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT UNSIGNED NOT NULL,
    transportadora_id INT UNSIGNED NULL,
    material VARCHAR(150) NOT NULL,
    fornecedor VARCHAR(150) NOT NULL,
    origem VARCHAR(255) NOT NULL,
    destino VARCHAR(255) NOT NULL,
    quantidade DECIMAL(12, 3) NOT NULL CHECK (quantidade > 0),
    unidade VARCHAR(20) NOT NULL,
    prazo_combinado DATE NOT NULL,
    recebido_em DATETIME NULL,
    etapa ENUM(
        'aguardando_confirmacao',
        'confirmado',
        'em_preparacao',
        'despachado',
        'em_transporte',
        'entregue',
        'cancelado'
    ) NOT NULL DEFAULT 'aguardando_confirmacao',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas (id),
    FOREIGN KEY (transportadora_id) REFERENCES transportadoras (id),
    UNIQUE KEY uq_pedido_empresa (id, empresa_id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS solicitacoes_transporte (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT UNSIGNED NOT NULL,
    empresa_id INT UNSIGNED NOT NULL,
    transportadora_id INT UNSIGNED NOT NULL,
    situacao ENUM('pendente', 'aceita', 'recusada', 'cancelada') NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id, empresa_id) REFERENCES pedidos (id, empresa_id),
    FOREIGN KEY (transportadora_id) REFERENCES transportadoras (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS atualizacoes_entrega (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT UNSIGNED NOT NULL,
    usuario_id INT UNSIGNED NOT NULL,
    etapa VARCHAR(40) NOT NULL,
    observacao VARCHAR(1000),
    ocorrido_em DATETIME NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos (id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE = InnoDB;
