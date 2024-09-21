import mySQL from 'mysql2'

const db = mySQL.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'coleta_premiada'
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