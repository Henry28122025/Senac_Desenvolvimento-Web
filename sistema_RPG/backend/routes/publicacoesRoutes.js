import express from "express";
import { listarPublicacoes, buscarPublicacao, cadastrarPublicacao, atualizarPublicacao, excluirPublicacao } from "../controllers/publicacoesControllers.js";
import { exigirUsuario } from "../middlewares/sessaoMiddleware.js";

const router = express.Router();
router.get("/", listarPublicacoes);
router.get("/:id", buscarPublicacao);
router.post("/", exigirUsuario, cadastrarPublicacao);
router.put("/:id", exigirUsuario, atualizarPublicacao);
router.delete("/:id", exigirUsuario, excluirPublicacao);
export default router;
