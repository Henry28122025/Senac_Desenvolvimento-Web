require('./config');
const express = require('express');
const path = require('node:path');
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    );
    if (req.path.startsWith('/api')) res.set('Cache-Control', 'no-store');
    next();
});
app.use(express.json({ limit: '16kb' }));
app.use('/api', require('./routes/inicioRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/pedidos', require('./routes/pedidosRoutes'));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use((req, res) => res.status(404).json({ mensagem: 'Rota não encontrada.' }));
app.use(require('./middlewares/errosMiddleware').tratarErro);
module.exports = app;
