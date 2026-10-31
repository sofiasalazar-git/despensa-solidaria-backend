const express = require('express');
const { crearMovimientoController } = require('../controllers/movimientoController');
const { metodoNoPermitido } = require('../middleware/metodoNoPermitido');

function crearRutasMovimientos(servicio) {
  const router = express.Router();
  const c = crearMovimientoController(servicio);

  router.route('/').get(c.listar).post(c.registrar).all(metodoNoPermitido(['GET', 'POST']));

  // No existe DELETE ni PUT: el historial no se borra ni se reescribe.
  router.route('/:id').get(c.obtener).patch(c.corregir).all(metodoNoPermitido(['GET', 'PATCH']));

  return router;
}

module.exports = { crearRutasMovimientos };
