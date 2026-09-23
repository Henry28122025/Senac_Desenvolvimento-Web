create database if not exists BIBLIOTECA_DOM;
use BIBLIOTECA_DOM;

create table livros(
id INT auto_increment PRIMARY KEY,
titulo varchar(150) NOT NULL,
autor varchar(100) NOT NULL,
ano INT NOT NULL
);

INSERT INTO livros(titulo, autor, ano) VALUES
('Dom Casmurro', 'Machado de Asis', 1899 ),
('O Hobbit', 'J. R. R. Tolkien', 1937 ),
('1984', 'George Orwell', 1937 ),
('O Pequeno Príncipe', 'Antoine e Saint-Exupéry', 1943 ),
('Harry Potter e a Pedra Filosofal', 'J. K. Rowling', 1997 );

SELECT * FROM livros