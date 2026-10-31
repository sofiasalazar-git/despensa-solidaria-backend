// Arma las piezas de la aplicación: repositorios -> servicios.
const { crearProductoRepository } = require('./repositories/productoRepository');
const { crearMovimientoRepository } = require('./repositories/movimientoRepository');
const { crearProductoService } = require('./services/productoService');
const { crearMovimientoService } = require('./services/movimientoService');

function crearServicios(db) {
  const productos = crearProductoRepository(db);
  const movimientos = crearMovimientoRepository(db);
  return {
    productoService: crearProductoService({ productos }),
    movimientoService: crearMovimientoService({ db, productos, movimientos }),
    productos,
    movimientos,
  };
}

module.exports = { crearServicios };
