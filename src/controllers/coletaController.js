import 'dotenv/config'
import db from "../database/index.js";
import { authenticateRotasAPI, rotasApi } from "../services/api.js";

const importColetasRotas = async () => {
    const token = await authenticateRotasAPI();
    try{
        const response = await rotasApi.get(`/coleta`, {
            headers: {
                'Authorization': `Bearer ${token}` // Insira o token no cabeçalho
            }
        });

        return response.data; // Retorna todos os registros obtidos da API do rotas, para acessar cada registro separadamente pode ser utilizado response.data[i]

    } catch (error) {
        if (error.response && error.response.status === 404) {
            return false;
        }
        throw new Error(`Erro ao verificar QRCode: ${error}`);
    }
}

const obterUltimaDataImportacao = async () => {
    const [data] = await db.promise().query(`SELECT dataImportacao FROM historico_importacoes_rotas WHERE situacao = 'sucesso' ORDER BY dataImportacao DESC LIMIT 1`);
    const ultimaData = data[0] // Acessa o primeiro e mais recente registro de importacao
    return ultimaData // Retorna utimaData que pode acesar os dados por: ultimaData.dataImportacao e ultimaData.situacao
};

class coletaController {
    async importarByData(req, res){
        try {
            // Obtém a última data de importação com sucesso
            const ultimaDataImportacao = await obterUltimaDataImportacao();
    
            // Obtém os dados de coleta
            const registros = await importColetasRotas();
            if (!registros || registros.length === 0) {
                console.log("Nenhum dado de coleta foi encontrado na API.");
                return res.status(500).send({ error: "Nenhum dado de coleta foi encontrado na API." })
            }
    
            // Filtra registros com DataHora posterior à última data de importação
            const novosRegistros = registros.filter(registro => 
                new Date(registro.DataHora) > new Date(ultimaDataImportacao?.dataImportacao)
            );
    
            if (novosRegistros.length === 0) {
                console.log("Nenhum novo registro para importar.");
                res.status(100).send({ message: "Nenhum novo registro para importar." })
            }
    
            // Agrupa e soma o peso coletado por cliente
            const totalPesoPorCliente = novosRegistros.reduce((acc, registro) => {
                if (!acc[registro.CodCliente]) {
                    acc[registro.CodCliente] = 0;
                }
                acc[registro.CodCliente] += registro.PesoColetado;
                return acc;
            }, {});
    
            // Inicia a transação para inserir os novos registros e atualizar o histórico de importação
            await db.promise().beginTransaction();
    
            // Insere os registros detalhados na tabela de destino (coleta_rotas_clone)
            for (const registro of novosRegistros) {
                await db.promise().query(
                    `INSERT INTO coleta_residuos (codColeta, codCliente, peso, dataColeta)
                    VALUES (?, ?, ?, ?)`,
                    [registro.CodColeta, registro.DataHora, registro.PesoColetado, registro.CodCliente]
                );
            }
    
            // Insere o registro consolidado de pontuação para cada cliente na tabela de Ação
            for (const [codCliente, pesoTotal] of Object.entries(totalPesoPorCliente)) {
                const pontos = Math.floor(pesoTotal); // Define a conversão de peso em pontos (exemplo: 1 kg = 1 ponto)
                await db.promise().query(
                    `INSERT INTO acao (codCliente, tipo, pontos)
                    VALUES (?, ?, ?)`,
                    [codCliente, 'coleta_residuos', pontos]
                );
            }
    
            // Atualiza o histórico de importação
            await db.promise().query(
                `INSERT INTO historico_importacoes_rotas (situacao)
                VALUES (?)`,
                ['sucesso']
            );
    
            // Confirma a transação
            await db.promise().commit();
            console.log("Importação e registro de pontuação concluídos com sucesso!");
    
    
        } catch (error) {
            // Desfaz a transação em caso de erro
            await db.promise().rollback();
            console.error("Erro ao importar registros:", error);
            
            // Registra no histórico de importações com situação 'erro'
            await db.promise().query(
                `INSERT INTO historico_importacoes_rotas (situacao)
                VALUES (?)`,
                ['erro']
            );
        }
    }
}

export default new coletaController();
