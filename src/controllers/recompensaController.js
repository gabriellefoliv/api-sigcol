import 'dotenv/config'
import db from "../database/index.js";
import axios from 'axios';
import clienteController from "../controllers/clienteController.js"

// URL da API parceira
const API_CONVERSAO_URL = 'https://reciclopontos.com.br/api/convert'; //RECICLOTRON

class recompensaController {
    async create(req, res){

        const { id } = req.params;
        const { idParceiro, pontos } = req.body;

        const[result] = await db.promise().query("SELECT nome, email, cpf FROM cliente WHERE codCliente = ?", [id],(err, result) => {
            if (err) {
                return res.status(500).send(err);
            }
        });

        const cpf = result[0].cpf;

        try{

            const response = await axios.post('https://reciclopontos.com.br/api/convert', 
                { 
                    token: '1a54b68b80f5131404d0051406be6a6d',
                    cpf: cpf,
                    description: "Conversão de Pontos em Reciclopontos",
                    points: pontos
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Extrair os dados relevantes da resposta
            const { credited, rate, balance, error } = response.data;

            if (!error){
                db.query(  `INSERT INTO recompensa
                    (codCliente, codParceiro, pontos)
                    VALUES (?, ?, ?);`, [id, idParceiro, pontos], (err) => {
                    if (err) {
                        return res.status(500).send(err);
                    } else {
                        return res
                            .status(200).send({ message: "Transferencia de pontos realizada com sucesso!" });
                    }
                });  
            }
            else {
                return res.status(400).send({ message: "Erro ao transferir: ", error})
            }

        } catch (err) {
            console.error("ERRO ao registrar troca de pontos!", err.message);
            return res.status(500).send({ message: 'Erro ao conectar com a API de conversão.' });
        }

    };
}

export default new recompensaController();