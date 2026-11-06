require('../config');
const mysql = require('mysql2/promise');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
    let c;
    try {
        if (process.env.DB_NAME && process.env.DB_NAME !== 'entrega_radar')
            throw new Error('O script usa o banco entrega_radar.');
        c = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });
        await c.query(fs.readFileSync(path.join(__dirname, '../../sql/entrega_radar.sql'), 'utf8'));
        console.log('Esquema criado.');
    } catch {
        console.error(
            'Falha ao preparar banco. Confira MySQL, permissões e .env (DB_NAME=entrega_radar).'
        );
        process.exitCode = 1;
    } finally {
        if (c) await c.end();
    }
})();
