const { noAutorizado } = require('../errors/ApiError');
const { validarToken } = require('../auth/seguridad');

function requerirAutenticacion(jwtSecret) {
  return (req, res, next) => {
    const autorizacion = req.get('Authorization') || '';
    const match = /^Bearer\s+(.+)$/i.exec(autorizacion);
    const usuario = match ? validarToken(match[1], jwtSecret) : null;
    if (!usuario) return next(noAutorizado('La sesión no es válida o venció. Inicia sesión de nuevo.'));
    req.usuario = usuario;
    next();
  };
}

module.exports = { requerirAutenticacion };
