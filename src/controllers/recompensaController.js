import 'dotenv/config'
import db from "../database/index.js";
import axios from 'axios';
import {readClientPoints} from './pontoController.js'

// URL da API parceira
const API_CONVERSAO_URL = 'https://reciclopontos.com.br/api/convert'; //RECICLOTRON

const readRecompensa = async (codCliente) => {
    try {
        const [result] = await db.promise().query(  // Use `await` para esperar o resultado
            `SELECT r.codRecompensa, r.pontos, r.dataResgate, p.nome AS nomeParceiro 
            FROM recompensa r
            JOIN parceiro p ON r.codParceiro = p.codParceiro
            WHERE codCliente = ?
            ORDER BY dataResgate DESC`, 
            [codCliente]
        );

        console.log(result);
        return result || []; // Retorna o resultado da consulta
    } catch (error) {
        console.error(`Erro ao registrar a recompensa:`, error);
        throw new Error("Erro ao ler recompensas"); // Lança um erro
    }
}

class recompensaController {

    async test(req, res) {

        const { id: codCliente } = req.params;
        const { codParceiro, pontos } = req.body;

        const result = await readClientPoints(codCliente);
        if (pontos > result.totalPontos){
            return res.status(300).send({message : "Pontos insuficientes!"})
        } else{
            try{
                db.query(  `INSERT INTO recompensa
                    (codCliente, codParceiro, pontos)
                    VALUES (?, ?, ?);`, [codCliente, codParceiro, pontos], (err) => {
                    if (err) {
                        return res.status(500).send(err);
                    } else {
                        return res
                            .status(200).send({ message: "Transferencia de pontos realizada com sucesso!" });
                    }
                });  
            } catch (error) {
                console.error("ERRO ao registrar troca de pontos!", error.message);
                return res.status(500).send({ message: 'Erro ao transferir pontos.' });
            }
        }


    }

    async create(req, res){

        const { id: codCliente } = req.params;
        const { codParceiro, pontos } = req.body;

        //const cpf = await readClientCPF(codCliente);

        const result = await readClientPoints(codCliente, 'resgate');

        if (pontos > result.totalPontos){
            return res.status(300).send({message : "Pontos insuficientes!"})
        } else{
            try{

                const response = await axios.post('https://reciclopontos.com.br/api/convert', 
                    { 
                        token: '1a54b68b80f5131404d0051406be6a6d',
                        //cpf: result.cpf,
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
                        VALUES (?, ?, ?);`, [codCliente, codParceiro, pontos], (err) => {
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
    
        }
    };


    async read(req, res) {
        const { id: codCliente } = req.params;

        try {
            const result = await readRecompensa(codCliente); // Aguarda o resultado

            // Verifica se encontrou algum dado
            if (!result || result.length === 0) {
                return res.status(404).send({ message: 'Nenhuma recompensa encontrada para este cliente.' });
            }

            // Se tudo estiver certo, envia os dados
            return res.status(200).send(result);

        } catch (error) {
            console.error("Erro ao buscar recompensas:", error);
            return res.status(500).send({ error: error.message }); // Retorna a mensagem de erro
        }
    }

}

export default new recompensaController();