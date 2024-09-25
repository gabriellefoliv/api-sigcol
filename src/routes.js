import { Router } from "express";
import sessionsController from "./controllers/sessionsController.js";
import clienteController from "./controllers/clienteController.js";
import auth from "./middlewares/auth.js";

const routes = Router();

const start = async (req, res) => {
    var now = new Date();
    return res.status(200).json({ msg: `API SIGCOL v1.1.0 - ${now}` })
}

//Rotas livres
routes.get("/", start)
routes.post("/login", sessionsController.create)

// Clientes
routes.post("/clientes/qrcode", clienteController.validateQRCode)
routes.post("/clientes/cadastro", clienteController.completeRegistration)

// Middleware de autenticação
routes.use(auth)

// Rotas protegidas


export default routes;