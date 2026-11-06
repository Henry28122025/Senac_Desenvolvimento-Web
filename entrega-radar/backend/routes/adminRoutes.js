const router = require('express').Router();
router.use(
    require('../middlewares/autenticacaoMiddleware'),
    require('../middlewares/autorizacaoMiddleware')('administrador')
);
router.get('/painel', require('../controllers/adminControllers').painel);
module.exports = router;
