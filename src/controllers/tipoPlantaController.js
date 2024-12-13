import "dotenv/config";
import db from "../database/index.js";

const buscarTipoPlanta = async () => {
  const [result] = await db
    .promise()
    .query(`SELECT codTipoPlanta, nomeTipoPlanta, descricao FROM tipo_planta;`);

  return result;
};

class tipoPlantaController {
  async read(req, res) {
    const tiposPlanta = await buscarTipoPlanta();
    return res.status(200).send(tiposPlanta);
  }
}

export default new tipoPlantaController();
