const express = require('express');
const { crearProductoController } = require('../controllers/productoController');
const { metodoNoPermitido } = require('../middleware/metodoNoPermitido');

function crearRutasProductos(servicio) {
  const router = express.Router();
  const c = crearProductoController(servicio);

  router.route('/').get(c.listar).post(c.crear).all(metodoNoPermitido(['GET', 'POST']));

  // Rutas fijas ANTES de /:id para que "por-vencer" no se interprete como un id
  router.route('/por-vencer').get(c.porVencer).all(metodoNoPermitido(['GET']));
  router.route('/bajo-stock').get(c.bajoStock).all(metodoNoPermitido(['GET']));

  router
    .route('/:id')
    .get(c.obtener)
    .put(c.actualizar)
    .delete(c.desactivar)
    .all(metodoNoPermitido(['GET', 'PUT', 'DELETE']));

  return router;
}

module.exports = { crearRutasProductos };
