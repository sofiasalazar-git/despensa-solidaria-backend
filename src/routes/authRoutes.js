const express = require('express');
const { crearAuthService } = require('../services/authService');
const { crearUsuarioRepository } = require('../repositories/usuarioRepository');

function crearRutasAuth(db, { jwtSecret, tokenDuracion }) {
  const router = express.Router();
  const servicio = crearAuthService({ usuarios: crearUsuarioRepository(db), jwtSecret, tokenDuracion });
  router.post('/login', async (req, res, next) => {
    try {
      res.status(200).json(await servicio.iniciarSesion(req.body));
    } catch (error) {
      next(error);
    }
  });
  router.post('/register', async (req, res, next) => {
    try {
      res.status(201).json(await servicio.registrarCuenta(req.body));
    } catch (error) {
      next(error);
    }
  });
  return router;
}

module.exports = { crearRutasAuth };
