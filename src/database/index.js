import mySQL from 'mysql2'
import dotenv from 'dotenv'

dotenv.config();

const db = mySQL.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_HOST_USER,
    password: process.env.MYSQL_HOST_PASSWORD,
    database: process.env.MYSQL_HOST_DATABASE,
    port: process.env.MYSQL_HOST_PORT,
})

db.getConnection((err) => {
    if (err) {
        console.log("Database Connection Error: " + JSON.stringify(err));
    }
    else {
        console.log('Database Connected!')
    }
});

export default db