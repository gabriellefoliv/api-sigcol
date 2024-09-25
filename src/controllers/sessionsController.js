import Jwt from "jsonwebtoken";
import db from "../database/index.js";
import { checkPassword } from "../services/auth.js";
import authConfig from '../config/auth.js';

class sessionsController {
    async create(req, res) {
        const { email, senha } = req.body;

        db.query("SELECT * FROM cliente WHERE email = ?", [email], async (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            }

            if (result.length === 0) {
                return res.status(401).json({ error: "Email inválido" });
            }

            // Se o email for encontrado
            const cliente = result[0];

            // Comparar a senha fornecida com o hash armazenado no banco de dados
            const isPasswordValid = await checkPassword(cliente.senha, senha);

            if (!isPasswordValid) {
                return res.status(401).json({ error: "Senha inválida" });
            }

            const { codCliente, nome } = cliente;

            return res.json({
                user: {
                    codCliente,
                    nome,
                    email
                },
                token: Jwt.sign({ codCliente, nome, email }, authConfig.secret, {
                    expiresIn: authConfig.expiresIn
                })
            });

        });
    }
}

export default new sessionsController();

