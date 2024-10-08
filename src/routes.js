import { Router } from "express";
import auth from "./middlewares/auth.js";
import clienteController from "./controllers/clienteController.js";
import sessionsController from "./controllers/sessionsController.js";
import quizController from "./controllers/quizController.js";
import rankingController from "./controllers/rankingController.js";

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
routes.get("/clientes", clienteController.read)

// Quiz
routes.post("/quiz", quizController.create)
routes.put("/quiz/:id", quizController.update)
routes.delete("/quiz/:id", quizController.delete)
routes.get("/quiz", quizController.getQuestion)
routes.post("/quiz/:id", quizController.submitAnswer)
routes.get("/quizAccess", quizController.checkQuizAccess)

// Ranking
routes.get("/ranking", rankingController.getRanking)


export default routes;