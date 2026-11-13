const router = require('express').Router();
const autenticar = require('../middlewares/autenticacaoMiddleware');
const autorizar = require('../middlewares/autorizacaoMiddleware');
const pedidos = require('../controllers/pedidosControllers');

router.use(autenticar, autorizar('contratante'));
router.get('/', pedidos.listar);
router.post('/', pedidos.criar);
router.get('/:id', pedidos.consultar);
router.put('/:id', pedidos.atualizar);
router.delete('/:id', pedidos.excluir);

module.exports = router;
