import express from "express";
import { listarEventos, buscarEvento, cadastrarEvento, atualizarEvento, excluirEvento, inscreverNoEvento, cancelarInscricao } from "../controllers/eventosControllers.js";
import { exigirUsuario, exigirAdmin } from "../middlewares/sessaoMiddleware.js";

const router = express.Router();
router.get("/", listarEventos);
router.get("/:id", buscarEvento);
router.post("/", exigirAdmin, cadastrarEvento);
router.put("/:id", exigirAdmin, atualizarEvento);
router.delete("/:id", exigirAdmin, excluirEvento);
router.post("/:id/inscricoes", exigirUsuario, inscreverNoEvento);
router.delete("/:id/inscricoes", exigirUsuario, cancelarInscricao);
export default router;
