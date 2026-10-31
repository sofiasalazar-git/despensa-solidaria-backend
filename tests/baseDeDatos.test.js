const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { abrirBaseDeDatos } = require('../src/db/database');
const config = require('../src/config/config');

async function abrirBaseDePrueba() {
  const nombre = `${config.mongoDbName}_test_${process.pid}_${randomUUID().replace(/-/g, '')}`;
  return { nombre, db: await abrirBaseDeDatos(config.mongoUri, nombre) };
}

describe('MongoDB: índices y validación de documentos', () => {
  it('crea índices únicos para nombres y búsquedas comunes', async () => {
    const { db } = await abrirBaseDePrueba();
    try {
      const indices = await db.productos.listIndexes().toArray();
      assert.ok(indices.some((indice) => indice.unique && indice.key.nombre_normalizado === 1));
      assert.ok((await db.movimientos.listIndexes().toArray()).some((indice) => indice.key.producto_id === 1));
    } finally {
      await db.db.dropDatabase();
      await db.close();
    }
  });

  it('rechaza documentos que infringen el esquema', async () => {
    const { db } = await abrirBaseDePrueba();
    try {
      await assert.rejects(
        db.productos.insertOne({
          _id: 1,
          nombre: 'Arroz',
          nombre_normalizado: 'arroz',
          categoria: 'Granos',
          categoria_normalizada: 'granos',
          unidad: 'libras',
          stock_actual: 0,
          stock_minimo: 0,
          fecha_vencimiento: null,
          activo: 1,
          created_at: '2026-01-01T00:00:00',
        }),
        (error) => error.code === 121,
      );
    } finally {
      await db.db.dropDatabase();
      await db.close();
    }
  });

  it('conserva los datos tras cerrar y reconectar', async () => {
    const { nombre, db } = await abrirBaseDePrueba();
    try {
      await db.productos.insertOne({
        _id: 1,
        id: 1,
        nombre: 'Arroz',
        nombre_normalizado: 'arroz',
        categoria: 'Granos',
        categoria_normalizada: 'granos',
        unidad: 'kg',
        stock_actual: 0,
        stock_minimo: 0,
        fecha_vencimiento: null,
        activo: 1,
        created_at: '2026-01-01T00:00:00',
      });
    } finally {
      await db.close();
    }

    const reconectada = await abrirBaseDeDatos(config.mongoUri, nombre);
    try {
      assert.equal((await reconectada.productos.findOne({ _id: 1 })).nombre, 'Arroz');
    } finally {
      await reconectada.db.dropDatabase();
      await reconectada.close();
    }
  });
});
