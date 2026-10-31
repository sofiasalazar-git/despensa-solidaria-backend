// Manejo global de errores. TODAS las respuestas de error tienen el mismo formato:
//   { status, error, mensaje, timestamp }
// Nunca se envían trazas internas ni detalles técnicos al cliente.
const { ApiError } = require('../errors/ApiError');
const { ahora } = require('../utils/fechas');

const ETIQUETAS = {
  400: 'Solicitud incorrecta',
  404: 'No encontrado',
  405: 'Método no permitido',
  409: 'Conflicto',
  500: 'Error interno del servidor',
};

function crearManejadorErrores({ registrarErrores = true } = {}) {
  // eslint-disable-next-line no-unused-vars
  return function manejadorErrores(err, req, res, next) {
    if (res.headersSent) return next(err);

    let status = 500;
    let mensaje = 'Ocurrió un error interno. Intente de nuevo.';

    if (err instanceof ApiError) {
      status = err.status;
      mensaje = err.message;
    } else if (err.type === 'entity.parse.failed') {
      status = 400;
      mensaje = 'El cuerpo de la petición no es un JSON válido.';
    } else if (err.type === 'entity.too.large') {
      status = 400;
      mensaje = 'El cuerpo de la petición es demasiado grande.';
    } else if (err.code === 11000 && err.keyPattern?.nombre_normalizado) {
      status = 409;
      mensaje = 'Ya existe un producto con ese nombre.';
    } else if (registrarErrores) {
      // El detalle técnico solo se escribe en la consola del servidor.
      console.error('[ERROR 500]', err);
    }

    res.status(status).json({ status, error: ETIQUETAS[status], mensaje, timestamp: ahora() });
  };
}

module.exports = { crearManejadorErrores };
