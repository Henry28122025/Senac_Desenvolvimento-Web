const router = require('express').Router();
router.use(require('../middlewares/autenticacaoMiddleware'));
router.get('/me',require('../controllers/usuariosControllers').me);
module.exports = router;
