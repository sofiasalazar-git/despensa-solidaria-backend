// Lógica de negocio de PRODUCTO.
const { noEncontrado, conflicto } = require('../errors/ApiError');
const { aProductoDto } = require('../models/producto');
const { hoy, sumarDias } = require('../utils/fechas');
const { validarProducto, validarFiltrosListado, validarDias } = require('../validators/productoValidator');

function crearProductoService({ productos }) {
  // Devuelve la fila o responde 404
  async function obtenerOFallar(id) {
    const fila = await productos.buscarPorId(id);
    if (!fila) throw noEncontrado(`No se encontró el producto con id ${id}.`);
    return fila;
  }

  return {
    // GET /api/productos
    async listar(query) {
      return (await productos.listar(validarFiltrosListado(query))).map(aProductoDto);
    },

    // GET /api/productos/{id}
    async obtener(id) {
      return aProductoDto(await obtenerOFallar(id));
    },

    // POST /api/productos  (el stock inicial siempre es 0)
    async crear(cuerpo) {
      const datos = validarProducto(cuerpo);
      if (await productos.existeNombre(datos.nombre)) {
        throw conflicto('Ya existe un producto con ese nombre.');
      }
      const id = await productos.crear(datos);
      return aProductoDto(await productos.buscarPorId(id));
    },

    // PUT /api/productos/{id}  (no modifica stock_actual)
    async actualizar(id, cuerpo) {
      const datos = validarProducto(cuerpo);
      await obtenerOFallar(id);
      if (await productos.existeNombre(datos.nombre, id)) {
        throw conflicto('Ya existe un producto con ese nombre.');
      }
      await productos.actualizar(id, datos);
      return aProductoDto(await productos.buscarPorId(id));
    },

    // DELETE /api/productos/{id}  (eliminación lógica: activo = false)
    async desactivar(id) {
      await obtenerOFallar(id);
      await productos.desactivar(id);
    },

    // GET /api/productos/por-vencer?dias=7  (entre hoy y hoy + N días)
    async porVencer(query) {
      const dias = validarDias(query);
      const desde = hoy();
      return (await productos.porVencer(desde, sumarDias(desde, dias))).map(aProductoDto);
    },

    // GET /api/productos/bajo-stock  (stock_actual <= stock_minimo)
    async bajoStock() {
      return (await productos.bajoStock()).map(aProductoDto);
    },
  };
}

module.exports = { crearProductoService };
