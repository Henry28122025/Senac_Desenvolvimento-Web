const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const secret = process.env.JWT_SECRET;
if (!secret || Buffer.byteLength(secret) < 32)
    throw new Error('Configure JWT_SECRET com pelo menos 32 bytes aleatórios.');
module.exports = { secret, issuer: 'entrega-radar', audience: 'entrega-radar-web', ttl: 3600 };
