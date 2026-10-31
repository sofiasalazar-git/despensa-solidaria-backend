const { MAXIMO } = require('../utils/numeros');
const { ahora } = require('../utils/fechas');
const { normalizarTexto, siguienteId } = require('../db/database');

function crearProductoRepository(db, session) {
  const opciones = session ? { session } : {};
  const redondear = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;

  return {
    async buscarPorId(id) {
      return db.productos.findOne({ _id: id }, opciones);
    },

    async existeNombre(nombre, excluirId = 0) {
      return Boolean(await db.productos.findOne({
        nombre_normalizado: normalizarTexto(nombre),
        _id: { $ne: excluirId },
      }, { projection: { _id: 1 }, ...opciones }));
    },

    async listar({ activo, buscar, categoria }) {
      const filtro = {};
      if (activo !== undefined) filtro.activo = activo ? 1 : 0;
      if (buscar) filtro.nombre_normalizado = { $regex: normalizarTexto(buscar).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') };
      if (categoria) filtro.categoria_normalizada = normalizarTexto(categoria);
      return db.productos.find(filtro, opciones).sort({ nombre_normalizado: 1, _id: 1 }).toArray();
    },

    async crear({ nombre, categoria, unidad, stockMinimo, fechaVencimiento }) {
      const id = await siguienteId(db, 'producto', session);
      await db.productos.insertOne({
        _id: id,
        id,
        nombre,
        nombre_normalizado: normalizarTexto(nombre),
        categoria,
        categoria_normalizada: normalizarTexto(categoria),
        unidad,
        stock_actual: 0,
        stock_minimo: stockMinimo,
        fecha_vencimiento: fechaVencimiento,
        activo: 1,
        created_at: ahora(),
      }, opciones);
      return id;
    },

    async actualizar(id, { nombre, categoria, unidad, stockMinimo, fechaVencimiento }) {
      const resultado = await db.productos.updateOne({ _id: id }, {
        $set: {
          nombre,
          nombre_normalizado: normalizarTexto(nombre),
          categoria,
          categoria_normalizada: normalizarTexto(categoria),
          unidad,
          stock_minimo: stockMinimo,
          fecha_vencimiento: fechaVencimiento,
        },
      }, opciones);
      return resultado.modifiedCount;
    },

    async desactivar(id) {
      const resultado = await db.productos.updateOne({ _id: id }, { $set: { activo: 0 } }, opciones);
      return resultado.modifiedCount;
    },

    async porVencer(desde, hasta) {
      return db.productos.find({
        activo: 1,
        fecha_vencimiento: { $ne: null, $gte: desde, $lte: hasta },
      }, opciones).sort({ fecha_vencimiento: 1, nombre_normalizado: 1 }).toArray();
    },

    async bajoStock() {
      return db.productos.find({
        activo: 1,
        $expr: { $lte: ['$stock_actual', '$stock_minimo'] },
      }, opciones).sort({ nombre_normalizado: 1, _id: 1 }).toArray();
    },

    async contar() {
      return db.productos.countDocuments({}, opciones);
    },

    async aplicarEntrada(id, cantidad, stockActual) {
      if (stockActual + cantidad > MAXIMO) return 0;
      const resultado = await db.productos.updateOne({
        _id: id,
        activo: 1,
        stock_actual: stockActual,
      }, { $set: { stock_actual: redondear(stockActual + cantidad) } }, opciones);
      return resultado.modifiedCount;
    },

    async aplicarSalida(id, cantidad, stockActual) {
      if (stockActual < cantidad) return 0;
      const resultado = await db.productos.updateOne({
        _id: id,
        activo: 1,
        stock_actual: stockActual,
      }, { $set: { stock_actual: redondear(stockActual - cantidad) } }, opciones);
      return resultado.modifiedCount;
    },
  };
}

module.exports = { crearProductoRepository };
