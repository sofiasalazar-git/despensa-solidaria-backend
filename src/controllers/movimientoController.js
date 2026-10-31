// Controlador de MOVIMIENTO: traduce HTTP <-> servicio. Sin lógica de negocio.
const { leerId } = require('../validators/comunes');

function manejarAsync(accion) {
  return (req, res, next) => Promise.resolve(accion(req, res)).catch(next);
}

function crearMovimientoController(servicio) {
  return {
    listar: manejarAsync(async (req, res) => res.status(200).json(await servicio.listar(req.query))),
    obtener: manejarAsync(async (req, res) => res.status(200).json(await servicio.obtener(leerId(req.params.id)))),
    registrar: manejarAsync(async (req, res) => res.status(201).json(await servicio.registrar(req.body))),
    corregir: manejarAsync(async (req, res) => res.status(200).json(await servicio.corregir(leerId(req.params.id), req.body))),
  };
}

module.exports = { crearMovimientoController };
