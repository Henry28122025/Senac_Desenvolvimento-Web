const express = require('express');
const controller = require('../controllers/inicioController');
const router = express.Router();

// Identificação pública da API; app.js monta este router em /api.
router.get('/', controller.apresentar);

module.exports = router;
