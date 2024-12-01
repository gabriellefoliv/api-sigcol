import db from "../database/index.js";
import { authenticateRotasAPI, rotasApi } from "../services/api.js";

const registrarHistoricoImportacao = async (situacao) => {
  try {
    await db.promise().query(
      `INSERT INTO historico_importacoes_rotas (dataImportacao, situacao) 
         VALUES (?, ?)`,
      [new Date(), situacao]
    );
    console.log(`Histórico de importação registrado como: ${situacao}`);
  } catch (error) {
    console.error("Erro ao registrar histórico de importação:", error);
    throw new Error("Erro ao registrar histórico de importação.");
  }
};

const getUltimaDataImportacao = async () => {
  try {
    const [rows] = await db.promise().query(
      `SELECT dataImportacao 
         FROM historico_importacoes_rotas 
         WHERE situacao = 'sucesso' 
         ORDER BY dataImportacao DESC LIMIT 1`
    );

    return rows.length ? rows[0].dataImportacao : "1970-01-01T00:00:00.000Z";
  } catch (error) {
    console.error("Erro ao obter a última data de importação:", error);
    throw new Error("Erro ao consultar a última data de importação.");
  }
};

const inserirColeta = async (coleta) => {
  try {
    await db.promise().query(
      `INSERT INTO coleta_residuos (codColeta, codCliente, peso, dataColeta) 
         VALUES (?, ?, ?, ?)`,
      [
        coleta.CodColeta,
        coleta.CodCliente,
        coleta.PesoColetado,
        coleta.DataHora,
      ]
    );
    console.log(`Coleta ${coleta.CodColeta} inserida com sucesso.`);
  } catch (error) {
    console.error(`Erro ao inserir coleta ${coleta.CodColeta}:`, error);
    throw new Error(`Erro ao inserir a coleta ${coleta.CodColeta}.`);
  }
};

const buscarNovasColetas = async (token, ultimaDataImportacao) => {
  try {
    // Se a ultimaDataImportacao já estiver no formato 'YYYY-MM-DD HH:MM:SS', podemos passar diretamente
    const dataImportacaoFormatada = ultimaDataImportacao; // Sem necessidade de formatação

    const response = await rotasApi.get(`/coleta`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { dataInicio: dataImportacaoFormatada }, // Passando a data no formato correto
    });

    const novasColetas = response.data;
    console.log(`${novasColetas.length} novas coletas encontradas.`);
    return novasColetas;
  } catch (error) {
    console.error("Erro ao buscar coletas da API Rotas:", error);
    throw new Error("Erro ao buscar coletas da API Rotas.");
  }
};

const registrarAcao = async (coleta, pontos) => {
  try {
    await db
      .promise()
      .query(`INSERT INTO acao (codCliente, tipo, pontos) VALUES (?, ?, ?)`, [
        coleta.CodCliente,
        "coleta_residuos",
        pontos,
      ]);
    console.log(
      `Ação para cliente ${coleta.CodCliente} registrada com sucesso.`
    );
  } catch (error) {
    console.error(
      `Erro ao registrar a ação para o cliente ${coleta.CodCliente}:`,
      error
    );
  }
};

// Verifica se existe o cliente o codCliente fornecido
const procurarCliente = async (codCliente) => {
  try {
    const [rows] = await db
      .promise()
      .query(`SELECT codCliente FROM cliente WHERE codCliente = ?`, [
        codCliente,
      ]);
    return rows.length > 0;
  } catch (error) {
    console.error("Erro ao procurar cliente:", error);
    throw new Error("Erro ao procurar cliente");
  }
};

const importarColetas = async () => {
  const token = await authenticateRotasAPI();

  try {
    const ultimaDataImportacao = await getUltimaDataImportacao();
    const novasColetas = await buscarNovasColetas(token, ultimaDataImportacao);

    if (novasColetas.length === 0) {
      console.log("Nenhuma nova coleta para importar.");
      return {
        status: "sucesso",
        message: "Nenhuma nova coleta para importar.",
      };
    }

    // Para cada coleta, verifica se o cliente está cadastrado
    for (const coleta of novasColetas) {
      const clienteExiste = await procurarCliente(coleta.CodCliente);

      if (clienteExiste) {
        await inserirColeta(coleta); // Registra a coleta no banco
        await registrarAcao(coleta, coleta.Pontos); // Registra a ação de pontos
      } else {
        console.log(
          `Cliente ${coleta.CodCliente} não cadastrado. Coleta descartada.`
        );
      }
    }

    await registrarHistoricoImportacao("sucesso");
    return {
      status: "sucesso",
      message: "Novas coletas importadas com sucesso.",
    };
  } catch (error) {
    console.error("Erro durante a importação:", error);
    await registrarHistoricoImportacao("erro");
    return { status: "erro", message: error.message };
  }
};

export default importarColetas;
