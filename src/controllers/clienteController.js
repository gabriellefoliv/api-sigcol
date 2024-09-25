import db from "../database/index.js";
import { authenticateRotasAPI, rotasApi } from "../services/api.js";
import { createPasswordHash } from "../services/auth.js";

const checkQRCodeExists = async (id) => {
    const token = await authenticateRotasAPI();

    try {
        const response = await rotasApi.get(`/clientes/qrcode/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        return response.status === 200;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return false;
        }
        throw new Error(`Erro ao verificar QRCode: ${error}`);
    }
};

const getClientByCpf = async (cpf) => {
    const token = await authenticateRotasAPI();

    try {
        const response = await rotasApi.get(`/clientes`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        // Pegamos o CPF_CNPJ da resposta da API externa
        const clientes = response.data;

        // Filtrar o cliente cujo CPF_CNPJ coincide com o CPF fornecido
        const clienteEncontrado = clientes.find(cliente => {
            const formattedCpfFromApi = cliente.CPF_CNPJ.replace(/[^\d]/g, ''); // Remove formatação
            return formattedCpfFromApi === cpf; // Comparação de CPF
        });

        if (clienteEncontrado) {
            return clienteEncontrado; // Cliente encontrado com o CPF correspondente
        } else {
            throw new Error('CPF não coincide com o registrado na API externa.');
        }
    } catch (error) {
        throw new Error('Erro ao buscar cliente por CPF na API externa');
    }
};

class clienteController {
    async validateQRCode(req, res) {
        const { codCliente } = req.body;

        try {
            const qrCodeExists = await checkQRCodeExists(codCliente);

            if (!qrCodeExists) {
                return res.status(400).send({ error: "QRCode não existe no Rotas" })
            }

            return res.status(200).send({ message: "QRCode validado com sucesso!" })

        } catch (error) {
            return res.status(500).send({ error: `Erro na validação do QRCode. ${error.message}` })
        }
    }

    async completeRegistration(req, res) {
        const { codCliente, nome, email, senha, cpf } = req.body;

        try {
            // Verificar o cliente pelo CPF na API externa
            const clienteExterno = await getClientByCpf(cpf);

            if (!clienteExterno || clienteExterno.CPF_CNPJ.replace(/[^\d]/g, '') !== cpf) {
                return res.status(400).send({ error: 'CPF não encontrado ou não coincide com o registrado na API externa.' });
            }

            // Verificar se o codCliente da API externa coincide com o codCliente fornecido
            if (clienteExterno.CodCliente !== codCliente) {
                return res.status(400).send({ error: 'Código do cliente não coincide com o registrado na API externa.' });
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

    async read(req, res) {
        db.query("SELECT codCliente, nome, email, senha, cpf FROM cliente", (err, result) => {
            if (err) {
                return res.status(500).send(err);
            }

            return res.send(result);
        })
    }
}

export default new clienteController();