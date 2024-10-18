import 'dotenv/config';
import cont from './src/controllers/coletaController.js'

(async () => {
    try {
        //const result = await cont.importColetasRotas();
        const result = await cont.obterUltimaDataImportacao();
        console.log("Resultado da função importColetasRotas:\n", result.data[0]);
    } catch (error) {
        console.error("Erro ao executar a função importColetasRotas:", error.message);
    }
})();