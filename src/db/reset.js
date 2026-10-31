const config = require('../config/config');
const { abrirBaseDeDatos } = require('./database');
const { sembrarSiEstaVacia } = require('./seed');

async function reiniciar() {
  const db = await abrirBaseDeDatos(config.mongoUri, config.mongoDbName);
  try {
    await Promise.all([
      db.productos.deleteMany({}),
      db.movimientos.deleteMany({}),
      db.counters.deleteMany({}),
    ]);
    await sembrarSiEstaVacia(db);
    console.log(`Base MongoDB reiniciada con datos de prueba: ${config.mongoDbName}`);
  } finally {
    await db.close();
  }
}

reiniciar().catch((error) => {
  console.error('No se pudo reiniciar la base de datos:', error);
  process.exitCode = 1;
});
