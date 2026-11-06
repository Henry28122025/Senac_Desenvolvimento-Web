const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const controller = require('../controllers/authControllers');
router.use(rateLimit({ windowMs: 15*60*1000, limit: 30, standardHeaders:'draft-8',legacyHeaders:false,
 message:{mensagem:'Muitas tentativas. Aguarde 15 minutos.'} }));
router.post('/cadastro',controller.cadastrar);
router.post('/login',controller.login);
module.exports = router;
