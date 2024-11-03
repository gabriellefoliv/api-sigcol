import db from "../database/index.js";

class rankingController {
    async getRanking(req, res) {
        try {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1; // Janeiro é 0, então somamos 1
            const currentYear = currentDate.getFullYear();

            db.query(
                `
                SELECT cliente.codCliente, cliente.nome, SUM(acao.pontos) AS total_pontos, MAX(acao.dataAcao) AS dataAcao
                FROM acao 
                JOIN cliente ON acao.codCliente = cliente.codCliente 
                WHERE MONTH(acao.dataAcao) = ? AND YEAR(acao.dataAcao) = ? 
                GROUP BY cliente.codCliente 
                ORDER BY total_pontos DESC
                `,
                [currentMonth, currentYear],
                (err, result) => {
                    if (err) {
                        console.error("Erro ao buscar o ranking: ", err);
                        return res.status(500).json({ error: "Erro ao buscar o ranking." });
                    }

                    return res.json(result);
                }
            );
        } catch (error) {
            console.error("Erro ao processar o ranking: ", error);
            return res.status(500).json({ error: "Erro ao processar o ranking." });
        }
    }

    async getRankingPositionById(req, res) {
        const { id } = req.params;

        try {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();

            // Consulta para obter o ranking completo para o mês atual
            db.query(
                `
                SELECT cliente.codCliente, cliente.nome, SUM(acao.pontos) AS total_pontos
                FROM acao 
                JOIN cliente ON acao.codCliente = cliente.codCliente 
                WHERE MONTH(acao.dataAcao) = ? AND YEAR(acao.dataAcao) = ? 
                GROUP BY cliente.codCliente 
                ORDER BY total_pontos DESC
                `,
                [currentMonth, currentYear],
                (err, result) => {
                    if (err) {
                        console.error("Erro ao buscar o ranking: ", err);
                        return res.status(500).json({ error: "Erro ao buscar o ranking." });
                    }

                    // Encontra a posição do cliente específico no ranking
                    const position = result.findIndex((item) => item.codCliente === parseInt(id)) + 1;

                    if (position === 0) {
                        return res.status(404).json({ error: "Cliente não encontrado no ranking." });
                    }

                    return res.json({ position, cliente: result[position - 1] });
                }
            );
        } catch (error) {
            console.error("Erro ao processar o ranking: ", error);
            return res.status(500).json({ error: "Erro ao processar o ranking." });
        }
    }

    async getColetaResiduosPosition(req, res) {
        const { id } = req.params;

        try {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();

            // Consulta para calcular o ranking filtrado pelo tipo `coleta_residuos`
            db.query(
                `
                SELECT cliente.codCliente, SUM(acao.pontos) AS total_pontos
                FROM acao
                JOIN cliente ON acao.codCliente = cliente.codCliente
                WHERE acao.tipo = 'coleta_residuos'
                  AND MONTH(acao.dataAcao) = ? 
                  AND YEAR(acao.dataAcao) = ?
                GROUP BY cliente.codCliente
                ORDER BY total_pontos DESC
                `,
                [currentMonth, currentYear],
                (err, result) => {
                    if (err) {
                        console.error("Erro ao calcular a posição no ranking: ", err);
                        return res.status(500).json({ error: "Erro ao calcular a posição no ranking." });
                    }

                    console.log(result);
                    // Encontra a posição do cliente logado
                    const position = result.findIndex((item) => item.codCliente === parseInt(id)) + 1;

                    if (position === 0) {
                        console.log("404")
                        return res.status(404).json({ error: "Cliente não encontrado no ranking de coleta_residuos." });
                    }

                    return res.json({ position });
                }
            );
        } catch (error) {
            console.error("Erro ao processar a posição no ranking: ", error);
            return res.status(500).json({ error: "Erro ao processar a posição no ranking." });
        }
    }
}

export default new rankingController();