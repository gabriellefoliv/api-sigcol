import db from "../database/index.js";
import { authenticateRotasAPI, rotasApi } from "../services/api.js";
class coletaController {
  async readTotalByClient(req, res) {
    const { id: codCliente } = req.params;
    // Verifica se codCliente foi passado
    if (!codCliente) {
      return res
        .status(400)
        .send({ error: "O parâmetro codCliente é necessário." });
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
      return res
        .status(400)
        .send({ error: "O parâmetro codCliente é necessário." });
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

  async Teste(req, res) {
    const token = await authenticateRotasAPI();
    const response = await rotasApi.get(`/coleta`, {
      headers: { Authorization: `Bearer ${token}` }, // Passando a data no formato correto
    });
    const novasColetas = response.data;
    console.log(`${novasColetas.length} novas coletas encontradas.`);
    return res.send(novasColetas);
  }
}

export default new coletaController();
