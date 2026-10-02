const botao = document.getElementById("BtnBuscar");
const listarLivros = document.getElementById("listarLivros");
const mensagem = document.getElementById("mensagem");

const formCadastrarLivro = document.getElementById("formCadastrarLivro");
const inputTitulo = document.getElementById("titulo");
const inputAutor = document.getElementById("autor");
const inputAno = document.getElementById("ano");

botao.addEventListener("click", buscarLivros);

formCadastrarLivro.addEventListener("submit", cadastrarLivro);

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
                </tr>`;
        }

        mensagem.textContent = `${livros.length} livro(s) encontrado(s).`;
    } catch (error) {
        console.error("Erro ao buscar livros:", error);
        mensagem.textContent = "Não foi possível buscar os livros. Verifique se a API está rodando.";
    }
}

async function cadastrarLivro(event) {
    //impede forms de recarregar a página
    event.preventDefault();
    try{
        const titulo = inputTitulo.value;
        const autor = inputAutor.value;
        const ano = inputAno.value;

        const livro = {titulo: titulo,autor: autor,ano: ano};
        console.log("livro enviado:", livro);

        //enviar para API
        const resposta = await fetch("http://localhost:3000/livros", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(livro)
        });
        if (!resposta.ok) {
            throw new Error("Erro HTTP: " + resposta.status);
        }
        const dados = await resposta.json();
        console.log("Resposta da API:", dados);

        formCadastrarLivro.reset();

        await buscarLivros();
        //mostrar mensagem retornada pela API
        mensagem.textContent = dados.mensagem;

    }catch (error) {
        console.error("Erro ao cadastrar livro:", error);
        mensagem.textContent = "Não foi possível cadastrar o livro. Verifique se a API está rodando.";
    }
}
