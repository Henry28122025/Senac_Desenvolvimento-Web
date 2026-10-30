function apresentar(req, res) {
    res.json({
        projeto: 'EntregaRadar',
        etapa: 'Entrega 1 - Problema e estrutura inicial',
        mensagem: 'Previsão de entregas e conexão entre empresas e transportadoras.',
        situacao: 'Funcionalidades de negócio em planejamento.'
    });
}

module.exports = { apresentar };
