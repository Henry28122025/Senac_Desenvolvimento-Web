const express = require('express');
const inicioRoutes = require('./routes/inicioRoutes');

const app = express();

app.use(express.json());
app.use('/', inicioRoutes);

// As rotas dos demais módulos serão conectadas quando forem implementadas.
module.exports = app;
