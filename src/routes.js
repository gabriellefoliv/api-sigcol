import { Router } from "express";
import auth from "./middlewares/auth.js";
import clienteController from "./controllers/clienteController.js";
import sessionsController from "./controllers/sessionsController.js";
import quizController from "./controllers/quizController.js";
import rankingController from "./controllers/rankingController.js";
import plantaController from "./controllers/plantaController.js";
import recompensaController from "./controllers/recompensaController.js";
import pontoController from "./controllers/pontoController.js";
import coletaController from "./controllers/coletaController.js";
import importarColetaController from "./controllers/importarColetaController.js";
import parceiroController from "./controllers/parceiroController.js";
import tipoPlantaController from "./controllers/tipoPlantaController.js";

const routes = Router();

const start = async (req, res) => {
  var now = new Date();
  return res.status(200).json({ msg: `API SIGCOL v1.1.0 - ${now}` });
};

//Rotas livres
routes.get("/", start);
routes.post("/login", sessionsController.create);

// Clientes
routes.post("/clientes/qrcode", clienteController.validateQRCode);
routes.post("/clientes/cadastro", clienteController.completeRegistration);

// Middleware de autenticação
routes.use(auth);

// Rotas protegidas

// Quiz
routes.post("/quiz", quizController.create);
routes.put("/quiz/:id", quizController.update);
routes.delete("/quiz/:id", quizController.delete);
routes.get("/quiz", quizController.getQuestion);
routes.post("/quiz/:id", quizController.submitAnswer);
routes.get("/quizAccess", quizController.checkQuizAccess);

// Ranking
routes.get("/ranking", rankingController.getRanking);
routes.get("/ranking/:id", rankingController.getRankingPositionById);
routes.get("/ranking/coletas/:id", rankingController.getColetaResiduosPosition);

// Planta
routes.post("/planta/:id", plantaController.create);
routes.get("/planta/:id", plantaController.read);
routes.put("/planta/rega/:id", plantaController.water);
routes.post("/planta/coleta/:id", plantaController.collect);

// Tipo Planta
routes.get("/tipoPlanta", tipoPlantaController.read);

// Recompensa
//routes.post("/recompensa/:id", recompensaController.create)
routes.post("/recompensa/:id", recompensaController.test);
routes.get("/recompensa/:id", recompensaController.read);

// Pontos
routes.get("/pontos/:id", pontoController.read);

// Coleta
//routes.post("/coleta", importarColetaController.importarColetas);
routes.get("/coleta", coletaController.read);
//routes.get("/coletas", coletaController.Teste);
routes.get("/coletaTotal/:id", coletaController.readTotalByClient);

// Parceiros
routes.get("/parceiros", parceiroController.read);

export default routes;
