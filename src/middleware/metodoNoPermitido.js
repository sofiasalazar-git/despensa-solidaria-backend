// Responde 405 (con el formato de error uniforme) cuando se usa un método HTTP
// que la ruta no admite; por ejemplo DELETE /api/movimientos/1 (el historial no se borra).
const { ApiError } = require('../errors/ApiError');

function metodoNoPermitido(permitidos) {
  return (req, res, next) => {
    res.set('Allow', permitidos.join(', '));
    if (req.method === 'OPTIONS') return res.status(204).end();
    next(new ApiError(405, `El método ${req.method} no está permitido en esta ruta. Permitidos: ${permitidos.join(', ')}.`));
  };
}

module.exports = { metodoNoPermitido };
