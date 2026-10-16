import express from "express";
import { fileURLToPath } from "node:url";
import corsMiddleware from "./middlewares/corsMiddleware.js";
import { tratarErros } from "./middlewares/errosMiddleware.js";
import publicacoesRoutes from "./routes/publicacoesRoutes.js";
import eventosRoutes from "./routes/eventosRoutes.js";
import produtosRoutes from "./routes/produtosRoutes.js";
import pedidosRoutes from "./routes/pedidosRoutes.js";
import { testarConexao } from "./database/conexao.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { consultarComunidade } from "./controllers/comunidadeControllers.js";
import { carregarUsuario, protegerOrigem } from "./middlewares/sessaoMiddleware.js";

const app = express();
app.use(corsMiddleware);
app.use(express.json({ limit: "32kb" }));
app.use("/api", protegerOrigem);
app.use("/api", (req, res, next) => {
  req.body ??= {};
  if (Array.isArray(req.body) || typeof req.body !== "object" || req.body === null) {
    return res.status(400).json({ mensagem: "Envie um objeto JSON." });
  }
  next();
});
app.use("/api", carregarUsuario);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.get("/api/comunidade", consultarComunidade);

app.get("/api", (req, res) => {
  res.json({ mensagem: "API Joelho de Grilo funcionando!", demonstracao: true });
});
app.get("/api/saude", async (req, res, next) => {
  try {
    await testarConexao();
    res.json({ status: "ok", banco: "conectado" });
  } catch (erro) {
    next(erro);
  }
});
app.use("/api/publicacoes", publicacoesRoutes);
app.use("/api/eventos", eventosRoutes);
app.use("/api/produtos", produtosRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api", (req, res) => res.status(404).json({ mensagem: "Rota não encontrada." }));

// O mesmo servidor entrega o HTML/CSS/JS e a API. Live Server também é compatível.
app.use(express.static(fileURLToPath(new URL("../frontend", import.meta.url))));
app.use(tratarErros);

export { app };
