const app = require('./app');
if (require.main === module) {
    const server = app.listen(Number(process.env.PORT || 3000), '127.0.0.1', () =>
        console.log('EntregaRadar: http://localhost:' + (process.env.PORT || 3000))
    );
    server.on('error', () => {
        console.error('Não foi possível iniciar o servidor.');
        process.exitCode = 1;
    });
}

module.exports = app;
