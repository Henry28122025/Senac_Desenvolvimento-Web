const app = require('./app');
const porta = 3000;

if (require.main === module) {
    const servidor = app.listen(porta, function iniciarServidor() {
        console.log('EntregaRadar: http://localhost:' + porta);
    });

    servidor.on('error', function tratarErro(erro) {
        console.error('Não foi possível iniciar o servidor:', erro.message);
        process.exitCode = 1;
    });
}

module.exports = app;
