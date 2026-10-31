// Controlador de PRODUCTO: traduce HTTP <-> servicio. Sin lógica de negocio.
const { leerId } = require('../validators/comunes');

function manejarAsync(accion) {
  return (req, res, next) => Promise.resolve(accion(req, res)).catch(next);
}

function crearProductoController(servicio) {
  return {
    listar: manejarAsync(async (req, res) => res.status(200).json(await servicio.listar(req.query))),
    obtener: manejarAsync(async (req, res) => res.status(200).json(await servicio.obtener(leerId(req.params.id)))),
    crear: manejarAsync(async (req, res) => res.status(201).json(await servicio.crear(req.body))),
    actualizar: manejarAsync(async (req, res) => res.status(200).json(await servicio.actualizar(leerId(req.params.id), req.body))),
    desactivar: manejarAsync(async (req, res) => {
      await servicio.desactivar(leerId(req.params.id));
      res.status(204).end();
    }),
    porVencer: manejarAsync(async (req, res) => res.status(200).json(await servicio.porVencer(req.query))),
    bajoStock: manejarAsync(async (req, res) => res.status(200).json(await servicio.bajoStock())),
  };
}

module.exports = { crearProductoController };
