import bcrypt from 'bcrypt'

export const createPasswordHash = async (password) => {
    return await bcrypt.hash(password, 8)
}

export const checkPassword = async (hash, password) => {
    return await bcrypt.compare(password, hash)
}
