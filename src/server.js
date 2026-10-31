const config = require('./config/config');
const { abrirBaseDeDatos } = require('./db/database');
const { sembrarSiEstaVacia } = require('./db/seed');
const { crearApp } = require('./app');

async function iniciar() {
  const db = await abrirBaseDeDatos(config.mongoUri, config.mongoDbName);
  try {
    if (config.cargarDatosDePrueba && await sembrarSiEstaVacia(db)) {
      console.log('Base de datos vacía: se cargaron datos de prueba ficticios.');
    }
  } catch (error) {
    await db.close();
    throw error;
  }

  const app = crearApp(db);
  const servidor = app.listen(config.puerto, config.host, () => {
    console.log('Despensa Solidaria - API REST en marcha');
    console.log(`  URL base : http://localhost:${config.puerto}/api`);
    console.log(`  MongoDB  : ${config.mongoDbName}`);
  });

  servidor.on('error', async (error) => {
    console.error('No se pudo iniciar el servidor:', error.message);
    await db.close();
    process.exitCode = 1;
  });

  async function cerrar() {
    servidor.close(async () => {
      await db.close();
      process.exit(0);
    });
  }

  process.once('SIGINT', cerrar);
  process.once('SIGTERM', cerrar);
}

iniciar().catch((error) => {
  console.error('No se pudo conectar con MongoDB o iniciar la API:', error);
  process.exitCode = 1;
});
