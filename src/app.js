// Construye la aplicación Express (sin abrir el puerto, para poder probarla).
const express = require('express');
const { crearServicios } = require('./composicion');
const { crearRutasProductos } = require('./routes/productoRoutes');
const { crearRutasMovimientos } = require('./routes/movimientoRoutes');
const { crearManejadorErrores } = require('./middleware/manejadorErrores');
const { ApiError } = require('./errors/ApiError');
const { crearRutasAuth } = require('./routes/authRoutes');
const { requerirAutenticacion } = require('./middleware/requerirAutenticacion');

function crearApp(db, opciones = {}) {
  const { productoService, movimientoService } = crearServicios(db);
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json()); // peticiones en JSON

  app.get('/api', (req, res) => {
    res.status(200).json({
      nombre: 'Despensa Solidaria API',
      estado: 'en marcha',
      endpoints: ['/api/auth/register', '/api/auth/login', '/api/productos', '/api/movimientos'],
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', db: 'conectada' });
  });

  if (opciones.jwtSecret) {
    app.use('/api/auth', crearRutasAuth(db, opciones));
    app.use('/api', requerirAutenticacion(opciones.jwtSecret));
  }

  app.use('/api/productos', crearRutasProductos(productoService));
  app.use('/api/movimientos', crearRutasMovimientos(movimientoService));

  // Cualquier otra ruta -> 404 con el mismo formato de error
  app.use((req, res, next) => next(new ApiError(404, `La ruta ${req.path} no existe.`)));

  app.use(crearManejadorErrores({ registrarErrores: opciones.registrarErrores !== false }));
  return app;
}

module.exports = { crearApp };
