const botao = document.getElementById("BtnBuscar");
const listarLivros = document.getElementById("listarLivros");
const mensagem = document.getElementById("mensagem");

const formCadastrarLivro = document.getElementById("formCadastrarLivro");
const inputTitulo = document.getElementById("titulo");
const inputAutor = document.getElementById("autor");
const inputAno = document.getElementById("ano");

botao.addEventListener("click", buscarLivros);

formCadastrarLivro.addEventListener("submit", salvarLivro);

let idEdicao = null;

const botaoSalvar = document.getElementById("BtnSalvar");

async function buscarLivros() {
    mensagem.textContent = "Buscando livros...";
    listarLivros.replaceChildren();

    try {
        const resposta = await fetch("http://localhost:3000/livros");
        if (!resposta.ok) {
            throw new Error("Erro HTTP: " + resposta.status);
        }

        const livros = await resposta.json();
        if (livros.length === 0) {
            mensagem.textContent = "Nenhum livro cadastrado.";
            return;
        }

        for (let i = 0; i < livros.length; i++) {
            listarLivros.innerHTML += `
                <tr>
                    <td>${livros[i].id}</td>
                    <td>${livros[i].titulo}</td>
                    <td>${livros[i].autor}</td>
                    <td>${livros[i].ano}</td>
                    <td>
                        <button onclick="editarLivro(${livros[i].id})">Editar</button>
                        <button onclick="excluirLivro(${livros[i].id})">Excluir</button>
                    </td>
                </tr>`;
        }

        mensagem.textContent = `${livros.length} livro(s) encontrado(s).`;
    } catch (error) {
        console.error("Erro ao buscar livros:", error);
        mensagem.textContent = "Não foi possível buscar os livros. Verifique se a API está rodando.";
    }
}

async function salvarLivro(event) {
    event.preventDefault();
    await cadastrarLivro(idEdicao);
}

async function cadastrarLivro(id = null) {
    try{
        const titulo = inputTitulo.value;
        const autor = inputAutor.value;
        const ano = inputAno.value;

        const livro = {titulo: titulo,autor: autor,ano: ano};
        console.log("livro enviado:", livro);

        //enviar para API
        const url = id === null ? "http://localhost:3000/livros" : "http://localhost:3000/livros/" + id;
        const resposta = await fetch(url, {
            method: id === null ? "POST" : "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(livro)
        });
        if (!resposta.ok) {
            throw new Error("Erro HTTP: " + resposta.status);
        }
        const dados = await resposta.json();
        console.log("Resposta da API:", dados);

        formCadastrarLivro.reset();
        idEdicao = null;
        botaoSalvar.textContent = "Cadastrar";

        await buscarLivros();
        //mostrar mensagem retornada pela API
        mensagem.textContent = dados.mensagem;

    }catch (error) {
        console.error("Erro ao salvar livro:", error);
        mensagem.textContent = "Não foi possível salvar o livro. Verifique se a API está rodando.";
    }
}

async function editarLivro(id) {
    try{
        //buscar pelo id o livro que será editado
        const resposta = await fetch("http://localhost:3000/livros/"+id);
        if (!resposta.ok) {
            throw new Error("Erro HTTP: " + resposta.status);
        }
        const livro = await resposta.json();
        inputTitulo.value = livro.titulo;
        inputAutor.value = livro.autor;
        inputAno.value = livro.ano;

        idEdicao = id;
        botaoSalvar.textContent = "Atualizar";
        mensagem.textContent = "Editando livro com ID: " + id;
    } catch (error) {
        mensagem.textContent = "Não foi possível carregar o livro para edição.";
        console.log("Erro ao carregar livro para edição:", error);
    }
}
    