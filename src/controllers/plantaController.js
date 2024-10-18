import 'dotenv/config'
import db from "../database/index.js";

class plantaController {

    async create(req, res){

        const { id: codCliente } = req.params;

        db.query(  `INSERT INTO planta
                    (codCliente)
                    VALUES (?);`, [codCliente], (error) => {
            if (error) {
                return res.status(500).send(err);
            } else {
                return res
                    .status(200).send({message: "Nova planta criada para o cliente!"});
            }
        });  
    };

    async read(req, res){

        const { id: codCliente } = req.params;

        db.query(   `SELECT *
                    FROM planta
                    WHERE codCliente = ?
                    ORDER BY dataCriada DESC
                    LIMIT 1;`, [codCliente], (error, result) => {
                        if (error) {
                            return res.status(500).send(error);
                        }

                        if (result.length === 0){
                            db.query(  `INSERT INTO planta
                                (codCliente)
                                VALUES (?);`, [codCliente], (error) => {
                                if (error) {
                                    return res.status(500).send(err);
                                } else {
                                    db.query(   `SELECT *
                                        FROM planta
                                        WHERE codCliente = ?
                                        ORDER BY dataCriada DESC
                                        LIMIT 1;`, [codCliente], (error, result) => {
                                            if (error) {
                                                return res.status(500).send(error);
                                            }
                                            else {
                                                return res.status(200).send(result);
                                            }
                                    });
                                }
                            });
                        }
                       
                        else {
                            return res.status(200).send(result);
                        }
        });
    };

    async water(req, res){

        const { id: codCliente } = req.params;
        try{

            const[result] = await db.promise().query( `SELECT codPlanta, estagio
                                    FROM planta
                                    WHERE codCliente = ?
                                    ORDER BY dataCriada DESC
                                    LIMIT 1;`, [codCliente]
            );

            const codPlanta = result[0].codPlanta;
            const estagio = result[0].estagio;

            if (estagio === 4){
                return res.status(300).send({ message: "Planta em estágio máximo, clique nela para coletá-la!"})
            }
            else {
                let regasNecessarias; // Numero de regas necessarias para subir para o proximo estagio
                let tempoRega; // Tempo necessário entre as regas
                
                switch (estagio) {
                    case 0:
                        regasNecessarias = 5;
                        tempoRega = 2;
                        break;
                    case 1:
                        regasNecessarias = 10;
                        tempoRega = 4;
                        break;
                    case 2:
                        regasNecessarias = 15;
                        tempoRega = 6;
                        break;
                    case 3:
                        regasNecessarias = 20;
                        tempoRega = 8;
                        break;
                    case 4:
                        regasNecessarias = null; // Pronto para coletar
                        tempoRega = 0;
                        break;
                    }
                

                const [regas] = await db.promise().query( `SELECT COUNT(*) AS total_regas
                                        FROM rega
                                        WHERE codPlanta = ?;`, [codPlanta]);

                const totalRegas = regas[0]?.total_regas || 0;
                
                if(totalRegas === regasNecessarias){
                    db.query( `UPDATE planta
                                            SET estagio = estagio + 1
                                            WHERE codPlanta = ?;`, [codPlanta]);
                } 
                
                if(totalRegas === 0){
                    db.query( `INSERT INTO rega
                                            (codPlanta, codCliente)
                                            VALUES (?,?);`, [codPlanta, codCliente]);
                }   
                
                else{

                    const [lastRega] = await db.promise().query( `SELECT dataRega
                                                                FROM rega
                                                                WHERE codPlanta = ?
                                                                ORDER BY dataRega DESC
                                                                LIMIT 1;`, [codPlanta, codCliente]);

                    const ultimaRega = new Date(lastRega[0].dataRega);
                    const tempoNecessario = tempoRega * 60 * 60 * 1000; // Mudar tempoRega para 0 quando testar e mudar de volta para tempoRega quando for oficialmente.
                    const agora = new Date();
                    const proximaRega = new Date(ultimaRega.getTime() + tempoNecessario);

                    // Verificar se já está pronto para regar novamente
                    if (agora < proximaRega) {
                        const tempoRestante = proximaRega - agora;

                        // Calcular horas e minutos restantes
                        const horasRestantes = Math.floor(tempoRestante / (1000 * 60 * 60)); // Horas
                        const minutosRestantes = Math.floor((tempoRestante % (1000 * 60 * 60)) / (1000 * 60)); // Minutos

                        console.log("esta no caso de nao regar novamente")
                        return res.status(400).send({ message: 'Não está pronto para regar novamente. Faltam ' + horasRestantes + ' h: ' + minutosRestantes + ' m.' });
                    };

                    db.query( `INSERT INTO rega
                                            (codPlanta, codCliente)
                                            VALUES (?,?);`, [codPlanta, codCliente]);
                }  
            };
            return res.status(200).send({ message: "Planta regada!" });

        } catch (error){
            console.error("Erro ao regar planta:", error);
            return res.status(500).send(error);
        };
    };

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
                LIMIT 1;`, [codCliente]
            )

            const estagio = rows[0].estagio;

            if(estagio != 4){
                return res
                        .status(200)
                        .send({ message: "Ainda nao está pronta para coleta"})
            }


            // Insere os pontos pela coleta da planta
            await connection.query(
                `INSERT INTO acao (codCliente, tipo, pontos)
                 VALUES (?, 'planta', ?);`,
                [codCliente, 5]
            );
    
            // Cria uma nova planta
            await connection.query(
                `INSERT INTO planta (codCliente)
                 VALUES (?);`,
                [codCliente]
            );
    
            await connection.commit(); // Confirma as alterações
            return res.status(200).send({ message: "Planta coletada com sucesso e nova plantada!" });

        } catch (error) {
            if (connection) await connection.rollback(); // Desfaz as alterações se algo der errado
            console.error("Erro ao coletar planta:", error);
            return res.status(500).send("Erro ao coletar planta.");
        } finally {
            if(connection) connection.release(); // Libera a conexão
        }
    }
};

export default new plantaController();