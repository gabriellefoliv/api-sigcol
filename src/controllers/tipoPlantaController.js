import "dotenv/config";
import db from "../database/index.js";

const buscarTipoPlanta = async () => {
  const [result] = await db
    .promise()
    .query(`SELECT codTipoPlanta, nomeTipoPlanta, descricao FROM tipo_planta;`);
  return result;
};

const buscarTipoPlantaPorCodigo = async (codTipoPlanta) => {
  const [result] = await db
    .promise()
    .query(
      `SELECT codTipoPlanta, nomeTipoPlanta, descricao FROM tipo_planta WHERE codTipoPlanta = ?;`,
      [codTipoPlanta]
    );
  return result[0]; // Retorna apenas o primeiro item, já que o codTipoPlanta é único
};

class tipoPlantaController {
  // Rota para buscar todos os tipos de planta
  async read(req, res) {
    try {
      const tiposPlanta = await buscarTipoPlanta();
      return res.status(200).send(tiposPlanta);
    } catch (error) {
      console.error("Erro ao buscar tipos de planta:", error.message);
      return res.status(500).send({ error: "Erro ao buscar tipos de planta." });
    }
  }

  // Rota para buscar um tipo de planta específico
  async readById(req, res) {
    const { codTipoPlanta } = req.params;

    try {
      const tipoPlanta = await buscarTipoPlantaPorCodigo(codTipoPlanta);

      if (!tipoPlanta) {
        return res.status(404).send({ error: "Tipo de planta não encontrado." });
      }

      return res.status(200).send(tipoPlanta);
    } catch (error) {
      console.error("Erro ao buscar tipo de planta:", error.message);
      return res.status(500).send({ error: "Erro ao buscar tipo de planta." });
    }
  }
}

export default new tipoPlantaController();
