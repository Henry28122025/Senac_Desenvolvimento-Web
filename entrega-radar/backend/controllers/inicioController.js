function apresentar(req, res) {
    res.json({
        projeto: 'EntregaRadar',
        entrega: 2
    });
}

module.exports = { apresentar };
