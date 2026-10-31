const { siguienteId } = require('../db/database');

function crearMovimientoRepository(db, session) {
  const opciones = session ? { session } : {};

  return {
    async buscarPorId(id) {
      return db.movimientos.findOne({ _id: id }, opciones);
    },

    async listar({ productoId, tipo, desde, hasta }) {
      const filtro = {};
      if (productoId !== undefined) filtro.producto_id = productoId;
      if (tipo !== undefined) filtro.tipo = tipo;
      if (desde !== undefined || hasta !== undefined) {
        filtro.fecha = {};
        if (desde !== undefined) filtro.fecha.$gte = desde;
        if (hasta !== undefined) filtro.fecha.$lte = hasta;
      }
      return db.movimientos.find(filtro, opciones).sort({ fecha: -1, _id: -1 }).toArray();
    },

    async insertar({ productoId, tipo, cantidad, fecha, responsable, observacion }) {
      const id = await siguienteId(db, 'movimiento', session);
      await db.movimientos.insertOne({
        _id: id,
        id,
        producto_id: productoId,
        tipo,
        cantidad,
        fecha,
        responsable,
        observacion,
      }, opciones);
      return id;
    },

    async corregir(id, { responsable, observacion }) {
      const cambios = {};
      if (responsable !== undefined) cambios.responsable = responsable;
      if (observacion !== undefined) cambios.observacion = observacion;
      const resultado = await db.movimientos.updateOne({ _id: id }, { $set: cambios }, opciones);
      return resultado.modifiedCount;
    },

    async contarPorProducto(productoId) {
      return db.movimientos.countDocuments({ producto_id: productoId }, opciones);
    },
  };
}

module.exports = { crearMovimientoRepository };
