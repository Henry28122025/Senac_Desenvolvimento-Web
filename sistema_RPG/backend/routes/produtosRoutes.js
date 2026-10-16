import express from "express";
import { listarProdutos, buscarProduto, cadastrarProduto, atualizarProduto, excluirProduto } from "../controllers/produtosControllers.js";
import { exigirAdmin } from "../middlewares/sessaoMiddleware.js";

const router = express.Router();
router.get("/", listarProdutos);
router.get("/:id", buscarProduto);
router.post("/", exigirAdmin, cadastrarProduto);
router.put("/:id", exigirAdmin, atualizarProduto);
router.delete("/:id", exigirAdmin, excluirProduto);
export default router;
