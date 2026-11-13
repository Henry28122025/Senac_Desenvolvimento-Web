function apresentar(req, res) {
    res.json({
        projeto: 'EntregaRadar',
        entrega: 3
    });
}

module.exports = { apresentar };
