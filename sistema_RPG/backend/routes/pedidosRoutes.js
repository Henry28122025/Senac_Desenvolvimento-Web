import express from "express";
import { listarPedidos, cadastrarPedido } from "../controllers/pedidosControllers.js";
import { exigirUsuario } from "../middlewares/sessaoMiddleware.js";

const router = express.Router();
router.get("/", exigirUsuario, listarPedidos);
router.post("/", exigirUsuario, cadastrarPedido);
export default router;
