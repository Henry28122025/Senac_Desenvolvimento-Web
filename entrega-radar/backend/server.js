const express = require('express');
const inicioRoutes = require('./routes/inicioRoutes');

const app = express();
const porta = 3000;

app.use(express.json());
app.use('/', inicioRoutes);

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
