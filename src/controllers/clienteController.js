import db from "../database/index.js";
import { authenticateRotasAPI, rotasApi } from "../services/api.js";
import { createPasswordHash } from "../services/auth.js";

const checkQRCodeExists = async (qrCode) => {
    const token = await authenticateRotasAPI();

    try {
        const response = await rotasApi.get(`/clientes`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const clientes = response.data;

        // Procurar o cliente com o QR Code (CodCliente) correspondente
        const clienteEncontrado = clientes.find(cliente => cliente.CodCliente === qrCode);

        if (clienteEncontrado) {
            return clienteEncontrado; // Retorna o cliente para a próxima etapa
        } else {
            throw new Error('QRCode não encontrado.');
        }
    } catch (error) {
        throw new Error(`Erro ao verificar QRCode: ${error}`);
    }
};

class clienteController {
    async validateQRCode(req, res) {
        const { codCliente } = req.body;

        try {
            const cliente = await checkQRCodeExists(codCliente);

            if (!cliente) {
                return res.status(400).send({ error: "QRCode não existe no Rotas" });
            }

            return res.status(200).send({ message: "QRCode validado com sucesso!", cliente });
        } catch (error) {
            return res.status(500).send({ error: `Erro na validação do QRCode. ${error.message}` });
        }
    }

    async completeRegistration(req, res) {
        const { codCliente, nome, email, senha, cpf } = req.body;

        try {
            // Verificar o cliente pelo QR Code e CPF
            const cliente = await checkQRCodeExists(codCliente);

            if (!cliente) {
                return res.status(400).send({ error: 'Código do cliente não encontrado.' });
            }

            const formattedCpfFromApi = cliente.CPF_CNPJ.replace(/[^\d]/g, '');
            if (formattedCpfFromApi !== cpf) {
                return res.status(400).send({ error: 'O CPF fornecido não coincide com o registrado no Rotas.' });
            }

            // Verificar se o cliente já existe pelo codCliente no banco de dados
            db.query('SELECT * FROM cliente WHERE codCliente = ?', [codCliente], async (err, results) => {
                if (err) {
                    return res.status(500).send({ error: 'Erro ao verificar cliente no banco de dados.' });
                }

                if (results.length > 0) {
                    return res.status(400).send({ error: 'QRCode já registrado no sistema.' });
                }

                const hashedPassword = await createPasswordHash(senha);
                // Se tudo estiver correto, cadastrar o cliente
                db.query(
                    `INSERT INTO cliente (codCliente, nome, email, senha, cpf) VALUES (?, ?, ?, ?, ?)`,
                    [codCliente, nome, email, hashedPassword, cpf],
                    (err) => {
                        if (err) {
                            console.error('Erro ao executar query:', err);
                            return res.status(500).send({ error: 'Erro ao cadastrar cliente.' });
                        } else {
                            return res.status(200).send({ message: 'Cadastro completo com sucesso!' });
                        }
                    }
                );
            });
        } catch (error) {
            return res.status(500).send({ error: `Erro ao completar o cadastro. ${error.message}` });
        }
    }
}

export default new clienteController();