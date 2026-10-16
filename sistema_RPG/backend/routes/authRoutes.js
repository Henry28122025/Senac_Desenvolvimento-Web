import express from "express";
import { cadastrarUsuario, entrar, minhaConta, sair, meuPerfil, atualizarPerfil } from "../controllers/authControllers.js";
import { exigirUsuario } from "../middlewares/sessaoMiddleware.js";

const router = express.Router();
router.get("/me", minhaConta);
router.get("/perfil", exigirUsuario, meuPerfil);
router.put("/perfil", exigirUsuario, atualizarPerfil);
router.post("/cadastro", cadastrarUsuario);
router.post("/login", entrar);
router.post("/logout", sair);
export default router;
