const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const derivar = promisify(scrypt);
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

async function hashSenha(senha) {
    const salt = randomBytes(16).toString('hex');
    const hash = await derivar(senha, salt, 64, options);
    return `scrypt$32768$8$3$${salt}$${hash.toString('hex')}`;
}

async function verificarSenha(senha, registro) {
    const partes = registro.split('$');
    if (partes.length !== 6 || partes.slice(0, 4).join('$') !== 'scrypt$32768$8$3') return false;
    const hash = await derivar(senha, partes[4], 64, options);
    const esperado = Buffer.from(partes[5], 'hex');
    return esperado.length === hash.length && timingSafeEqual(hash, esperado);
}

module.exports = { hashSenha, verificarSenha };
