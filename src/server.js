import app from "./app.js";
import 'dotenv/config'

const PORT = process.env.PORT || 5000

app.listen(PORT)
console.log(`Servidor aberto com sucesso na porta ${PORT}`)