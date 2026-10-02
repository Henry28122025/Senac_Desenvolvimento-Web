import express from "express";

import "dotenv/config";
import livrosRoutes from "./routes/livrosRoutes.js";
import corsMiddleware from "./middlewares/corsMiddleware.js";
import { testarConexao } from "./database/conexao.js";

//CRIANDO APLICAÇÕES
const app = express();
const PORT = process.env.PORT || 3000;

//MIDDLEWARES
app.use(corsMiddleware);
app.use(express.json());

//ROTAS
app.use("/livros", livrosRoutes);

//ROTA INICIAL
app.get("/", function(req, res){
    res.status(200).json({mensagem: "API da biblioteca funcionando!"});

});

async function iniciarServidor(){
    try {
        await testarConexao();
        app.listen(PORT, function(){
            console.log("Servidor rodando em http://localhost:" 
            + PORT);
        });
    } catch (error) {
        console.error("Não foi possível iniciar o servidor:", error.message);
        process.exit(1);
    }
}
iniciarServidor();
