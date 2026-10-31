const { MongoClient } = require('mongodb');

function normalizarTexto(texto) {
  if (texto === null || texto === undefined) return null;
  return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

async function abrirBaseDeDatos(uri, nombreBaseDeDatos) {
  const cliente = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await cliente.connect();
    const db = cliente.db(nombreBaseDeDatos);
    await asegurarColeccion(db, 'productos', {
      bsonType: 'object',
      required: [
        '_id', 'nombre', 'nombre_normalizado', 'categoria', 'categoria_normalizada', 'unidad',
        'stock_actual', 'stock_minimo', 'fecha_vencimiento', 'activo', 'created_at',
      ],
      properties: {
        _id: { bsonType: 'int', minimum: 1 },
        nombre: { bsonType: 'string', minLength: 2, maxLength: 100 },
        nombre_normalizado: { bsonType: 'string', minLength: 2, maxLength: 100 },
        categoria: { bsonType: 'string', minLength: 1, maxLength: 50 },
        categoria_normalizada: { bsonType: 'string' },
        unidad: { enum: ['kg', 'litros', 'unidades'] },
        stock_actual: { bsonType: ['double', 'int', 'long', 'decimal'], minimum: 0, maximum: 99999999.99 },
        stock_minimo: { bsonType: ['double', 'int', 'long', 'decimal'], minimum: 0, maximum: 99999999.99 },
        fecha_vencimiento: { bsonType: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        activo: { enum: [0, 1] },
        created_at: { bsonType: 'string' },
      },
    });
    await asegurarColeccion(db, 'movimientos', {
      bsonType: 'object',
      required: ['_id', 'producto_id', 'tipo', 'cantidad', 'fecha', 'responsable', 'observacion'],
      properties: {
        _id: { bsonType: 'int', minimum: 1 },
        producto_id: { bsonType: 'int', minimum: 1 },
        tipo: { enum: ['ENTRADA', 'SALIDA'] },
        cantidad: {
          bsonType: ['double', 'int', 'long', 'decimal'],
          minimum: 0,
          exclusiveMinimum: true,
          maximum: 99999999.99,
        },
        fecha: { bsonType: 'string' },
        responsable: { bsonType: 'string', minLength: 1, maxLength: 80, pattern: '\\S' },
        observacion: { bsonType: ['string', 'null'], maxLength: 200 },
      },
    });
    await asegurarColeccion(db, 'counters', {
      bsonType: 'object',
      required: ['_id', 'valor'],
      properties: {
        _id: { bsonType: 'string' },
        valor: { bsonType: 'int', minimum: 0 },
      },
    });
    const productos = db.collection('productos');
    const movimientos = db.collection('movimientos');

    await Promise.all([
      productos.createIndex({ nombre_normalizado: 1 }, { unique: true }),
      productos.createIndex({ activo: 1, fecha_vencimiento: 1 }),
      productos.createIndex({ activo: 1, stock_actual: 1, stock_minimo: 1 }),
      movimientos.createIndex({ producto_id: 1, fecha: -1, _id: -1 }),
    ]);

    return {
      client: cliente,
      db,
      productos,
      movimientos,
      counters: db.collection('counters'),
      async close() {
        await cliente.close();
      },
    };
  } catch (error) {
    await cliente.close();
    throw error;
  }
}

async function asegurarColeccion(db, nombre, schema) {
  const validator = { $jsonSchema: schema };
  const existe = await db.listCollections({ name: nombre }, { nameOnly: true }).hasNext();
  if (existe) {
    await db.command({ collMod: nombre, validator, validationLevel: 'strict', validationAction: 'error' });
  } else {
    await db.createCollection(nombre, { validator, validationLevel: 'strict', validationAction: 'error' });
  }
}

async function siguienteId(db, nombre, session) {
  const resultado = await db.counters.findOneAndUpdate(
    { _id: nombre },
    { $inc: { valor: 1 } },
    { upsert: true, returnDocument: 'after', ...(session ? { session } : {}) },
  );
  return resultado.valor;
}

module.exports = { abrirBaseDeDatos, normalizarTexto, siguienteId };
