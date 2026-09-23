import express from "express";
import { listarLivros } from "../controllers/livrosControllers.js";

const routers=express.Router();
routers.get("/" , listarLivros);

export default routers;
