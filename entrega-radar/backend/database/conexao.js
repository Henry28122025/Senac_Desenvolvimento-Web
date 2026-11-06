require('../config');
const mysql = require('mysql2/promise');
module.exports = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'entrega_radar',
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 20,
    multipleStatements: false
});
