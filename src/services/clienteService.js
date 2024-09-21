const db = require("../database/index");

module.exports ={

    findByID: () => {
        return new Promisse((acept, reject) => {
            db.query('SELECT * FROM cliente WHERE codCliente = ?', [id], (error, result) => {
                if (error) {
                    reject(error); 
                    return;
                }
                acept(result);
            });
        });
    },



};