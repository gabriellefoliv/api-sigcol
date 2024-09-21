import { Router } from "express";

const routes = Router();

const start = async (req, res) => {
    var now = new Date();
    return res.status(200).json({msg: `API ROTAS v1.1.0 - ${now}`})
}

//Rotas livres
routes.get("/", start)

export default routes;