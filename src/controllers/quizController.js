import db from "../database/index.js";

class quizController {
    async create(req, res) {
        const { descricao_pergunta, descricao_resposta, dificuldade, resposta_correta } = req.body;

        db.query(
            `INSERT INTO pergunta_quiz (descricao_pergunta, descricao_resposta, dificuldade, resposta_correta) 
            VALUES (?, ?, ?, ?)`,
            [descricao_pergunta, descricao_resposta, dificuldade, resposta_correta],
            (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send(err);
                }
                return res.status(201).json({ message: "Pergunta adicionada com sucesso!", id: result.insertId });
            }
        )
    }

    async update(req, res) {
        const { id: codPergunta } = req.params;
        const { descricao_pergunta, descricao_resposta, dificuldade, resposta_correta } = req.body;

        db.query(
            `UPDATE pergunta_quiz 
            SET descricao_pergunta = ?, descricao_resposta = ?, dificuldade = ?, resposta_correta = ?
            WHERE codPergunta = ?`,
            [descricao_pergunta, descricao_resposta, dificuldade, resposta_correta, codPergunta],
            (err) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send(err);
                }
                return res.status(200).json({ message: "Pergunta atualizada com sucesso!" });
            }
        )
    }

    async delete(req, res) {
        const { id: codPergunta } = req.params;

        db.query(
            `DELETE FROM pergunta_quiz WHERE codPergunta = ?`,
            [codPergunta],
            (err) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send(err);
                }
                return res.status(200).json({ message: "Pergunta deletada com sucesso!" });
            }
        )
    }

    async getQuestion(req, res) {
        const { codCliente, dificuldade } = req.query;

        db.query(
            `SELECT codPergunta FROM jogo_quiz WHERE codCliente = ?`,
            [codCliente],
            (err, perguntasRespondidas) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send(err);
                }

                const perguntasRespondidasIds = perguntasRespondidas.map(pr => pr.codPergunta);

                db.query(
                    `SELECT * FROM pergunta_quiz 
                    WHERE dificuldade = ? AND codPergunta NOT IN (?) 
                    ORDER BY RAND() LIMIT 1`,
                    [dificuldade, perguntasRespondidasIds.length ? perguntasRespondidasIds : [-1]],
                    (err, pergunta) => {
                        if (err) {
                            console.log(err);
                            return res.status(500).send(err);
                        }
                        if (pergunta.length === 0) {
                            return res.status(404).json({ message: "Sem perguntas disponíveis para o nível selecionado." })
                        }
                        return res.status(200).json(pergunta[0]);
                    }
                )
            }
        )
    }

    async submitAnswer(req, res) {
        const { codCliente, resposta } = req.body;
        const { id: codPergunta } = req.params;
        const hoje = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

        // Verifica se o cliente já respondeu a essa pergunta hoje
        db.query(
            `SELECT * FROM jogo_quiz WHERE codCliente = ? AND codPergunta = ? AND DATE(dataResposta) = ?`,
            [codCliente, codPergunta, hoje],
            (err, resultado) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send(err);
                }

                if (resultado.length > 0) {
                    return res.status(400).json({ message: "Você já respondeu a uma pergunta hoje!" })
                }

                // Verifica se a resposta está correta
                db.query(
                    `SELECT resposta_correta, dificuldade, descricao_resposta FROM pergunta_quiz WHERE codPergunta = ?`,
                    [codPergunta],
                    (err, pergunta) => {
                        if (err) {
                            console.log(err);
                            return res.status(500).send(err);
                        }

                        const { resposta_correta, dificuldade, descricao_resposta } = pergunta[0];
                        const acertou = resposta_correta === resposta;

                        let pontos = 0;

                        if (acertou) {
                            if (dificuldade === "facil") pontos = 1;
                            if (dificuldade === "medio") pontos = 1.5;
                            if (dificuldade === "dificil") pontos = 2;
                        }

                        const respostaInteira = acertou ? 1 : 0;

                        // Registrar a resposta do jogador
                        db.query(
                            `INSERT INTO jogo_quiz (codCliente, codPergunta, resposta, dataResposta) VALUES (?, ?, ?, NOW())`,
                            [codCliente, codPergunta, respostaInteira],
                            (err) => {
                                if (err) {
                                    console.log(err);
                                    return res.status(500).send(err);
                                }

                                if (pontos > 0) {
                                    // Adiciona pontos a tabela Ação
                                    db.query(
                                        "INSERT INTO acao (codCliente, tipo, pontos, dataAcao) VALUES (?, 'quiz', ?, NOW())",
                                        [codCliente, pontos],
                                        (err) => {
                                            if (err) {
                                                console.log(err);
                                                return res.status(500).send(err);
                                            }
                                            // Retorna a explicação e a confirmação da resposta correta
                                            return res.status(200).json({
                                                message: "Resposta correta!",
                                                descricao_resposta,
                                                pontos
                                            });
                                        }
                                    );
                                } else {
                                    return res.status(200).json({
                                        message: "Resposta errada.",
                                        descricao_resposta
                                    });
                                }
                            }
                        )
                    }
                )
            }
        )
    }

    async checkQuizAccess(req, res) {
        const { codCliente, dataResposta } = req.query;

        db.query(
            `SELECT * FROM jogo_quiz WHERE codCliente = ? AND DATE(dataResposta) = ?`,
            [codCliente, dataResposta],
            (err, resultado) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send(err);
                }

                return res.status(200).json(resultado); // Retorna se houve resposta no dia
            }
        );
    }

}

export default new quizController();