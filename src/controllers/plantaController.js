import "dotenv/config";
import db from "../database/index.js";

const getPlantaInfo = async (codPlanta) => {
  try {
    const [result] = await db.promise().query(
      `SELECT p.codCliente, p.codPlanta, p.estagio, COUNT(r.codRega) AS totalRegas,
      tp.tempoRega,
      TIMESTAMPDIFF(
        SECOND, 
        NOW(), 
        DATE_ADD(MAX(r.dataRega), INTERVAL tp.tempoRega HOUR)
      ) * 1000 AS tempoRestante
      FROM planta p
      LEFT JOIN rega r ON p.codPlanta = r.codPlanta
      INNER JOIN tipo_planta AS tp ON p.codTipoPlanta = tp.codTipoPlanta
      WHERE p.codPlanta = ?
      GROUP BY p.codPlanta
      ORDER BY p.dataCriada DESC;`,
      [codPlanta]
    );
    return result.length ? result[0] : null;
  } catch (error) {
    console.error("Erro ao obter informações da planta:", error);
    throw new Error("Erro ao buscar informações da planta.");
  }
};

// Função para inserir rega
const insertRega = async (codPlanta, codCliente) => {
  try {
    await db
      .promise()
      .query(`INSERT INTO rega (codPlanta, codCliente) VALUES (?, ?);`, [
        codPlanta,
        codCliente,
      ]);
    console.log(`Rega inserida para planta ${codPlanta}`);
  } catch (error) {
    console.error("Erro ao inserir rega:", error);
    throw new Error("Erro ao registrar rega.");
  }
};

// Função para atualizar o estágio da planta
const updateEstagio = async (codPlanta) => {
  try {
    await db
      .promise()
      .query(`UPDATE planta SET estagio = estagio + 1 WHERE codPlanta = ?;`, [
        codPlanta,
      ]);
    console.log(`Estágio da planta ${codPlanta} atualizado.`);
  } catch (error) {
    console.error("Erro ao atualizar estágio da planta:", error);
    throw new Error("Erro ao atualizar estágio da planta.");
  }
};

class plantaController {
  async create(req, res) {
    const { id: codCliente } = req.params;

    db.query(
      `INSERT INTO planta
                    (codCliente)
                    VALUES (?);`,
      [codCliente],
      (error) => {
        if (error) {
          return res.status(500).send(err);
        } else {
          return res
            .status(200)
            .send({ message: "Nova planta criada para o cliente!" });
        }
      }
    );
  }

  async read(req, res) {
    const { id: codCliente } = req.params;

    db.query(
      `SELECT 
    planta.codPlanta, 
    planta.dataCriada, 
    planta.estagio,
    tipo_planta.nomeTipoPlanta, 
    tipo_planta.tempoRega,
    TIMESTAMPDIFF(
        SECOND, 
        NOW(), 
        DATE_ADD(
            (SELECT dataRega 
             FROM rega 
             WHERE rega.codPlanta = planta.codPlanta 
             ORDER BY dataRega DESC 
             LIMIT 1),
            INTERVAL tipo_planta.tempoRega HOUR
        )
    ) * 1000 AS tempoRestante
    FROM planta
    INNER JOIN tipo_planta ON planta.codTipoPlanta = tipo_planta.codTipoPlanta
    WHERE 
      planta.codCliente = ?
      AND planta.ativa = 'sim'
    ORDER BY planta.dataCriada DESC;`,
      [codCliente],
      async (error, result) => {
        if (error) {
          return res.status(500).send(error);
        } else {
          return res.status(200).json(result);
        }
      }
    );
  }

  async water(req, res) {
    const { id: codPlanta } = req.params;

    try {
      // Obter informações da planta
      const plantaInfo = await getPlantaInfo(codPlanta);
      if (!plantaInfo) {
        return res.status(404).send({ message: "Planta não encontrada." });
      }
      const { codCliente, estagio, totalRegas, tempoRestante } = plantaInfo;

      if (estagio === 4) {
        return res.status(300).send({
          message: "Planta em estágio máximo, clique nela para coletá-la!",
        });
      }

      // Configuração das regras para cada estágio
      // Quando o número de regas necessárias estiverem no BD em tipo_planta, essa informação pode ser importada via query
      const regrasEstagio = {
        0: { regasNecessarias: 2 },
        1: { regasNecessarias: 2 },
        2: { regasNecessarias: 2 },
        3: { regasNecessarias: 2 },
      };

      const { regasNecessarias } = regrasEstagio[estagio] || {};
      if (totalRegas === regasNecessarias) {
        // Atualizar estágio da planta se atingir o limite de regas
        await updateEstagio(codPlanta);
      }

      // Registrar a rega
      if (tempoRestante > 0) {
        return res
          .status(201)
          .send({ message: "Aguarde para regar novamente!" });
      }
      await insertRega(codPlanta, codCliente);

      return res.status(200).send({ message: "Planta regada!" });
    } catch (error) {
      console.error("Erro ao regar planta:", error);
      return res.status(500).send({ message: "Erro ao regar planta.", error });
    }
  }

  async collect(req, res) {
    const { id: codCliente } = req.params;
    let connection;

    try {
      connection = await db.promise().getConnection(); // Pega uma conexão para iniciar a transação
      await connection.beginTransaction(); // Inicia uma transação

      const [rows] = await connection.query(
        `SELECT codPlanta, estagio
                FROM planta
                WHERE codCliente=?
                ORDER BY dataCriada DESC
                LIMIT 1;`,
        [codCliente]
      );

      const estagio = rows[0].estagio;

      if (estagio != 4) {
        return res
          .status(200)
          .send({ message: "Ainda nao está pronta para coleta" });
      }

      // Insere os pontos pela coleta da planta
      await connection.query(
        `INSERT INTO acao (codCliente, tipo, pontos)
                 VALUES (?, 'planta', ?);`,
        [codCliente, 15]
      );

      // Cria uma nova planta
      await connection.query(
        `INSERT INTO planta (codCliente)
                 VALUES (?);`,
        [codCliente]
      );

      await connection.commit(); // Confirma as alterações
      return res
        .status(200)
        .send({ message: "Planta coletada com sucesso e nova plantada!" });
    } catch (error) {
      if (connection) await connection.rollback(); // Desfaz as alterações se algo der errado
      console.error("Erro ao coletar planta:", error);
      return res.status(500).send("Erro ao coletar planta.");
    } finally {
      if (connection) connection.release(); // Libera a conexão
    }
  }
}

export default new plantaController();

// Função de rega antiga:

/*
async water(req, res) {
  const { id: codCliente } = req.params;
  try {
    const [result] = await db.promise().query(
      `SELECT codPlanta, estagio
                                  FROM planta
                                  WHERE codCliente = ?
                                  ORDER BY dataCriada DESC
                                  LIMIT 1;`,
      [codCliente]
    );

    const codPlanta = result[0].codPlanta;
    const estagio = result[0].estagio;

    if (estagio === 4) {
      return res.status(300).send({
        message: "Planta em estágio máximo, clique nela para coletá-la!",
      });
    } else {
      let regasNecessarias; // Numero de regas necessarias para subir para o proximo estagio
      let tempoRega; // Tempo necessário entre as regas

      switch (estagio) {
        case 0:
          regasNecessarias = 5;
          tempoRega = 2;
          break;
        case 1:
          regasNecessarias = 5;
          tempoRega = 4;
          break;
        case 2:
          regasNecessarias = 5;
          tempoRega = 6;
          break;
        case 3:
          regasNecessarias = 5;
          tempoRega = 8;
          break;
        case 4:
          regasNecessarias = null; // Pronto para coletar
          tempoRega = 0;
          break;
      }

      const [regas] = await db.promise().query(
        `SELECT COUNT(*) AS total_regas
                                      FROM rega
                                      WHERE codPlanta = ?;`,
        [codPlanta]
      );

      const totalRegas = regas[0]?.total_regas || 0;

      if (totalRegas === regasNecessarias) {
        db.query(
          `UPDATE planta
                                          SET estagio = estagio + 1
                                          WHERE codPlanta = ?;`,
          [codPlanta]
        );
      }

      if (totalRegas === 0) {
        db.query(
          `INSERT INTO rega
                                          (codPlanta, codCliente)
                                          VALUES (?,?);`,
          [codPlanta, codCliente]
        );
      } else {
        const [lastRega] = await db.promise().query(
          `SELECT dataRega
                                                              FROM rega
                                                              WHERE codPlanta = ?
                                                              ORDER BY dataRega DESC
                                                              LIMIT 1;`,
          [codPlanta, codCliente]
        );

        const ultimaRega = new Date(lastRega[0].dataRega);
        const tempoNecessario = 0 * 60 * 60 * 1000; // Mudar tempoRega para 0 quando testar e mudar de volta para tempoRega quando for oficialmente.
        const agora = new Date();
        const proximaRega = new Date(ultimaRega.getTime() + tempoNecessario);

        // Verificar se já está pronto para regar novamente
        if (agora < proximaRega) {
          console.log("Verificando quando regar novamente");
          const tempoRestante = proximaRega - agora;

          // Calcular horas e minutos restantes
          const horasRestantes = Math.floor(tempoRestante / (1000 * 60 * 60)); // Horas
          const minutosRestantes = Math.floor(
            (tempoRestante % (1000 * 60 * 60)) / (1000 * 60)
          ); // Minutos

          const proximaRegaTimestamp = new Date(tempoRestante).getTime();
          console.log("tempo : ", proximaRegaTimestamp);
          return res.status(201).send({ tempo: proximaRegaTimestamp });
        }

        db.query(
          `INSERT INTO rega
                                          (codPlanta, codCliente)
                                          VALUES (?,?);`,
          [codPlanta, codCliente]
        );
      }
    }
    return res.status(200).send({ message: "Planta regada!" });
  } catch (error) {
    console.error("Erro ao regar planta:", error);
    return res.status(500).send(error);
  }
}
*/
