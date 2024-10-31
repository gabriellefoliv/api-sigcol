import db from "../database/index.js";
import { authenticateRotasAPI, rotasApi } from "../services/api.js";

const registrarAcao = async (coleta, pontos) => {
    try {
        await db.promise().query(
            `INSERT INTO acao (codCliente, tipo, pontos) VALUES (?, ?, ?)`, 
            [coleta.CodCliente, 'coleta_residuos', pontos]
        );
        console.log(`Ação para cliente ${coleta.CodCliente} registrada com sucesso.`);
    } catch (error) {
        console.error(`Erro ao registrar a ação para o cliente ${coleta.CodCliente}:`, error);
    }
};

const registrarColeta = async (coleta) => {
    try {
        await db.promise().query(
            `INSERT INTO coleta_residuos (codColeta, codCliente, peso, dataColeta) VALUES (?, ?, ?, ?)`, 
            [coleta.CodColeta, coleta.CodCliente, coleta.PesoColetado, coleta.DataHora]
        );
        console.log(`Coleta ${coleta.CodColeta} registrada com sucesso.`);
    } catch (error) {
        console.error(`Erro ao registrar a coleta ${coleta.CodColeta}:`, error);
    }
};

// Verifica se existe o cliente o codCliente fornecido
const procurarCliente = async (codCliente) => {
    try{
        const [rows] = await db.promise().query(`SELECT codCliente FROM cliente WHERE codCliente = ?`, [codCliente]);
        return rows.length > 0;
    } catch (error) {
        console.error("Erro ao procurar cliente:", error);
        throw new Error("Erro ao procurar cliente");
    }
}

const registrarNovasColetas = async (novasColetas, res) => {
    try {
        let pontos;

        for (let coleta of novasColetas) {
            console.log("CodCliente sendo verificado: ", coleta.CodCliente);
            const existe = await procurarCliente(coleta.CodCliente);
            console.log("Retorno de procurarCliente: ", existe);
            if (existe){
                console.log("Cliente existe nos registros.");
                // Registra a nova coleta
                await registrarColeta(coleta, res);

                // Calcula os pontos e registra a ação correspondente
                pontos = 1 * coleta.PesoColetado;
                await registrarAcao(coleta, pontos, res);
            } else {
                console.log("Cliente não existe nos registros.");
            }
        }

        console.log("Novas coletas registradas com sucesso.");

    } catch (error) {
        console.error("Erro ao registrar novas coletas:", error);
    }
};

const getUltimaColetaRegistrada = async () => {
    try {
        // Consulta para obter a data da última coleta registrada
        const [rows] = await db.promise().query(`SELECT dataColeta FROM coleta_residuos ORDER BY dataColeta DESC LIMIT 1`);

        if (rows.length > 0) {
            return rows[0].dataColeta; // Retorna a data da última coleta registrada
        } else {
            return '1970-01-01T00:00:00.000Z'; // Data mínima se não houver registros
        }

    } catch (error) {
        console.error("Erro ao obter a data da última coleta registrada:", error);
    }
};


class coletaController {

    async readTotalByClient(req, res) {
        const { id: codCliente } = req.params;
        // Verifica se codCliente foi passado
        if (!codCliente) {
            return res.status(400).send({ error: "O parâmetro codCliente é necessário." });
        }
        db.query(
            "SELECT SUM(peso) AS totalPeso FROM coleta_residuos WHERE codCliente = ?",
            [codCliente],
            (err, result) => {
                if (err) {
                    return res.status(500).send(err);
                }
                return res.send(result);
            }
        );
    }
    
    async read(req, res) {
        const codCliente = req.query.codCliente;
        // Verifica se codCliente foi passado
        if (!codCliente) {
            return res.status(400).send({ error: "O parâmetro codCliente é necessário." });
        }
        db.query(
            "SELECT codColeta, codColetor, codCliente, peso, dataColeta FROM coleta_residuos WHERE codCliente = ?",
            [codCliente],
            (err, result) => {
                if (err) {
                    return res.status(500).send(err);
                }
                return res.send(result);
            }
        );
    }

    async importarColetas (req, res){
        const token = await authenticateRotasAPI();

        try {
            // Obtém todas as coletas da API
            const response = await rotasApi.get(`/coleta`, {
                headers: {
                    'Authorization': `Bearer ${token}` // Insira o token no cabeçalho
                }
            });

            // Obtém a última coleta registrada do banco de dados
            const ultimaColetaRegistrada = await getUltimaColetaRegistrada();
            console.log(`Última coleta registrada: ${ultimaColetaRegistrada}`);

            // Filtra as novas coletas da API que ocorreram após a última coleta registrada
            const novasColetas = response.data.filter(coleta => new Date(coleta.DataHora) > new Date(ultimaColetaRegistrada));

            // Verifica se há novas coletas a serem inseridas
            if (novasColetas.length === 0) {
                console.log("Não há novas coletas para registrar.");
                return res.status(200).send({ message: "Nenhuma nova coleta!" })
            }

            // Insere as novas coletas no banco de dados
            await registrarNovasColetas(novasColetas);
            return res.status(200).send({ message: "Novas coletas registradas com sucesso!" })

        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log("Nenhuma coleta encontrada na API.");
                return res.status(400).send({ error: "Nenhuma coleta encontrada na API!"});
            }
            console.error("Erro ao verificar coletas:", error);
            return res.status(500).send({ error: "Erro ao verificar coletas!"});
        }
    };
}

export default new coletaController();