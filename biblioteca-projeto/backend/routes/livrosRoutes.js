import express from "express";
import { listarLivros, buscarLivroPorId, cadastrarLivro, atualizarLivro } from "../controllers/livrosControllers.js";

const routers=express.Router();
    routers.get("/" , listarLivros);
    routers.get("/:id", buscarLivroPorId);
    routers.post("/" , cadastrarLivro);
    routers.put("/:id" , atualizarLivro);
export default routers;
