import db from "../database/index.js";

// Sendo razao uma verificacao se será para o resgate de recompensa ou para o app, portanto diferenciando para codCliente ou CPF no resultado:
const readClientPoints = async (codCliente, razao) => {

    let id;
    if( razao === 'resgate'){
        id = 'cpf';
    } else {
        id = 'codCliente';
    }

    const now = new Date();
    const month = now.getMonth() + 1; // O mês é zero-indexado, então somamos 1
    const year = now.getFullYear(); // Obtém o ano atual

    try {
        const [result] = await db.promise().query(
            `SELECT c.${id}, 
                (IFNULL((
                    SELECT SUM(a.pontos) 
                    FROM acao a 
                    WHERE a.codCliente = c.codCliente 
                    AND MONTH(a.dataAcao) = ? 
                    AND YEAR(a.dataAcao) = ?
                ), 0) 
                - IFNULL((
                    SELECT SUM(r.pontos) 
                    FROM recompensa r 
                    WHERE r.codCliente = c.codCliente 
                    AND MONTH(r.dataAcao) = ? 
                    AND YEAR(r.dataAcao) = ?
                ), 0)) AS totalPontos
            FROM cliente c
            WHERE c.codCliente = ?;`, 
            [month, year, month, year, codCliente]);
            console.log(result)
            return result;
    } catch (error) {
        console.error(`Erro ao ler total de pontos e cpf:`, error);
        return error;
    }
}

class pontosController {
    async read(req, res) {

        const { id: codCliente } = req.params;
        const result = await readClientPoints(codCliente, 'app');
        // Verifica se a resposta é um erro
        if (result.error) {
            return res.status(500).send(result);  // Envia o objeto de erro
        }
        // Se tudo estiver certo, envia os dados
        return res.status(200).send(result);
    }
}

export {readClientPoints};
export default new pontosController();