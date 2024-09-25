import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config();

let jwtToken;

export const rotasApi = axios.create({
    baseURL: process.env.EXPO_PUBLIC_ROTAS_API_URL,
})

export const authenticateRotasAPI = async () => {
    if (jwtToken) {
        return jwtToken;
    }

    try {
        const response = await rotasApi.post('/login', {
            login: process.env.ROTAS_CLIENT_LOGIN,
            senha: process.env.ROTAS_CLIENT_SENHA,
        })

        jwtToken = response.data.token;
        return jwtToken;
    } catch (error) {
        throw new Error('Failed to authenticate with Rotas API')
    }
}
