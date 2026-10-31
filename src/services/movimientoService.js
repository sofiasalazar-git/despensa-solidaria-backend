const { noEncontrado, conflicto } = require('../errors/ApiError');
const { aMovimientoDto } = require('../models/movimiento');
const { ahora } = require('../utils/fechas');
const { formatear, MAXIMO } = require('../utils/numeros');
const { crearProductoRepository } = require('../repositories/productoRepository');
const { crearMovimientoRepository } = require('../repositories/movimientoRepository');
const {
  validarNuevoMovimiento,
  validarCorreccion,
  validarFiltrosMovimientos,
} = require('../validators/movimientoValidator');

function crearMovimientoService({ db, productos, movimientos }) {
  function mensajeSinExistencia(producto, cantidad) {
    return (
      `No hay existencia suficiente. Disponible: ${formatear(producto.stock_actual)} ${producto.unidad}, ` +
      `solicitado: ${formatear(cantidad)} ${producto.unidad}.`
    );
  }

  return {
    async listar(query) {
      return (await movimientos.listar(validarFiltrosMovimientos(query))).map((fila) => aMovimientoDto(fila));
    },

    async obtener(id) {
      const fila = await movimientos.buscarPorId(id);
      if (!fila) throw noEncontrado(`No se encontró el movimiento con id ${id}.`);
      return aMovimientoDto(fila);
    },

    async registrar(cuerpo) {
      const datos = validarNuevoMovimiento(cuerpo);
      const session = db.client.startSession();
      let resultado;
      try {
        await session.withTransaction(async () => {
          const productosTx = crearProductoRepository(db, session);
          const movimientosTx = crearMovimientoRepository(db, session);
          const producto = await productosTx.buscarPorId(datos.productoId);
          if (!producto) throw noEncontrado(`No se encontró el producto con id ${datos.productoId}.`);
          if (producto.activo !== 1) throw conflicto('El producto está desactivado.');

          if (datos.tipo === 'SALIDA' && datos.cantidad > producto.stock_actual) {
            throw conflicto(mensajeSinExistencia(producto, datos.cantidad));
          }

          const cambios = datos.tipo === 'ENTRADA'
            ? await productosTx.aplicarEntrada(datos.productoId, datos.cantidad, producto.stock_actual)
            : await productosTx.aplicarSalida(datos.productoId, datos.cantidad, producto.stock_actual);
          if (cambios !== 1) {
            if (datos.tipo === 'ENTRADA') {
              throw conflicto(`El stock resultante superaría el máximo permitido (${MAXIMO}).`);
            }
            const actual = await productosTx.buscarPorId(datos.productoId);
            throw conflicto(mensajeSinExistencia(actual, datos.cantidad));
          }

          const id = await movimientosTx.insertar({ ...datos, fecha: ahora() });
          const actualizado = await productosTx.buscarPorId(datos.productoId);
          resultado = { id, stockResultante: actualizado.stock_actual };
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
      } finally {
        await session.endSession();
      }
      return aMovimientoDto(await movimientos.buscarPorId(resultado.id), resultado.stockResultante);
    },

    async corregir(id, cuerpo) {
      const datos = validarCorreccion(cuerpo);
      if (!await movimientos.buscarPorId(id)) throw noEncontrado(`No se encontró el movimiento con id ${id}.`);
      await movimientos.corregir(id, datos);
      return aMovimientoDto(await movimientos.buscarPorId(id));
    },
  };
}

module.exports = { crearMovimientoService };
