import jwt from 'jsonwebtoken'

import authConfig from '../config/auth.js'

export default async (req, res, next) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({ error: "Token was not provided" })
    }

    const [, token] = authHeader.split(' ')

    try {
        const decoded = jwt.verify(token, authConfig.secret)

        req.userId = decoded.CodUser

        return next()
    } catch (error) {
        return res.status(401).json({ error: "Invalid Token" })
    }
}