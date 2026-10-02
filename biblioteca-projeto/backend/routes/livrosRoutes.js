import express from "express";
import { listarLivros, cadastrarLivro } from "../controllers/livrosControllers.js";

const routers=express.Router();
    routers.get("/" , listarLivros);
    routers.post("/" , cadastrarLivro);
export default routers;