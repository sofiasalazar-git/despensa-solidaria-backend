// Configuración central. Todo se puede cambiar con variables de entorno.
require('dotenv').config({ quiet: true });

module.exports = {
  puerto: Number(process.env.PORT) || 8080,
  host: process.env.HOST || '0.0.0.0',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017',
  mongoDbName: process.env.MONGO_DB_NAME || 'despensa_solidaria',
  cargarDatosDePrueba: process.env.SEED_ON_START !== 'false',
  jwtSecret: process.env.JWT_SECRET || '',
  tokenDuracion: process.env.JWT_TTL || '8h',
  usuarioInicial: {
    email: process.env.AUTH_INITIAL_EMAIL || '',
    password: process.env.AUTH_INITIAL_PASSWORD || '',
  },
};
