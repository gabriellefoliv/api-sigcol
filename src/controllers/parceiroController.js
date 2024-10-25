import db from "../database/index.js";

class parceiroController {

    async read(req, res) {
        try {
            const [result] = await db.promise().query( `SELECT codParceiro, nome
                                                        FROM parceiro;`);
            if (result.length > 0) {
                return res.status(200).send(result);
            } else {
                return res.status(300).send({ message: "Nenhum parceiro encontrado!" });
            }
        } catch (error) {
                return res.status(500).send(error);
        }
        
    }
};

export default new parceiroController();