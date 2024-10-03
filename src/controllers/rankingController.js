import db from "../database/index.js";

class rankingController {
    async getRanking(req, res) {
        try {
            // Consulta pra somar os pontos e organizar por ordem decrescente
            db.query(`
                SELECT cliente.codCliente, cliente.nome, SUM(acao.pontos) AS total_pontos 
                FROM acao 
                JOIN cliente ON acao.codCliente = cliente.codCliente 
                GROUP BY cliente.codCliente 
                ORDER BY total_pontos DESC
                `,
                (err, result) => {
                    if (err) {
                        console.error("Erro ao buscar o ranking: ", err);
                        return res.status(500).json({ error: "Erro ao buscar o ranking." });
                    }

                    return res.json(result);
                }
            )
        } catch (error) {
            console.error("Erro ao processar o ranking: ", error);
            return res.status(500).json({ error: "Erro ao processar o ranking." });
        }
    }
}

export default new rankingController();