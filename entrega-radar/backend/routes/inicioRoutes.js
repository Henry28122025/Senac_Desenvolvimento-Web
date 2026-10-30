const express = require('express');
const controller = require('../controllers/inicioController');
const router = express.Router();

// Rota inicial apenas para identificar o projeto nesta entrega.
router.get('/', controller.apresentar);

module.exports = router;
