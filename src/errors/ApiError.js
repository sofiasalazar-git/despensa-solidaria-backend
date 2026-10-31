// Error controlado de la API: lleva el código HTTP y un mensaje comprensible
// para el cliente móvil.
class ApiError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
  }
}

module.exports = {
  ApiError,
  solicitudIncorrecta: (m) => new ApiError(400, m), // 400
  noEncontrado: (m) => new ApiError(404, m),        // 404
  conflicto: (m) => new ApiError(409, m),           // 409
};
