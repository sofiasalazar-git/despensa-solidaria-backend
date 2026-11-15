const { solicitudIncorrecta, noAutorizado, conflicto } = require('../errors/ApiError');
const { verificarPassword, crearToken, crearHash } = require('../auth/seguridad');
const crypto = require('node:crypto');
const { ahora } = require('../utils/fechas');

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function crearAuthService({ usuarios, jwtSecret, tokenDuracion }) {
  const hashFalso = crearHash(crypto.randomBytes(32).toString('hex'));
  return {
    async iniciarSesion(cuerpo) {
      if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
        throw solicitudIncorrecta('El cuerpo de la petición debe ser un objeto JSON.');
      }
      const email = typeof cuerpo.email === 'string' ? cuerpo.email.trim().toLowerCase() : '';
      const password = cuerpo.password;
      if (!EMAIL_VALIDO.test(email) || email.length > 254) {
        throw solicitudIncorrecta('Escribe un correo electrónico válido.');
      }
      if (typeof password !== 'string' || password.length === 0 || Buffer.byteLength(password, 'utf8') > 1024) {
        throw solicitudIncorrecta('La contraseña es obligatoria.');
      }

      const usuario = await usuarios.buscarPorEmail(email);
      const passwordValida = usuario
        ? await verificarPassword(password, usuario.password_hash)
        : await verificarPassword(password, await hashFalso);
      if (!usuario || !passwordValida) throw noAutorizado('Correo o contraseña incorrectos.');

      return {
        token: crearToken(usuario, jwtSecret, tokenDuracion),
        tipo: 'Bearer',
        expiraEn: tokenDuracion,
        usuario: { nombre: usuario.nombre || usuario.email.split('@')[0], email: usuario.email },
      };
    },

    async registrarCuenta(cuerpo) {
      if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
        throw solicitudIncorrecta('El cuerpo de la petición debe ser un objeto JSON.');
      }
      const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';
      const email = typeof cuerpo.email === 'string' ? cuerpo.email.trim().toLowerCase() : '';
      const password = cuerpo.password;
      if (nombre.length < 2 || nombre.length > 80 || /[\r\n]/.test(nombre)) {
        throw solicitudIncorrecta('El nombre debe tener entre 2 y 80 caracteres.');
      }
      if (!EMAIL_VALIDO.test(email) || email.length > 254) {
        throw solicitudIncorrecta('Escribe un correo electrónico válido.');
      }
      if (typeof password !== 'string' || Array.from(password).length < 10 || Array.from(password).length > 128 || Buffer.byteLength(password, 'utf8') > 512) {
        throw solicitudIncorrecta('La contraseña debe tener entre 10 y 128 caracteres.');
      }
      if (await usuarios.buscarPorEmail(email)) throw conflicto('Ya existe una cuenta con ese correo.');

      const passwordHash = await crearHash(password);
      try {
        await usuarios.crearCuenta({ nombre, email, passwordHash, creadoEn: ahora() });
      } catch (error) {
        if (error.code === 11000) throw conflicto('Ya existe una cuenta con ese correo.');
        throw error;
      }
      return { nombre, email, mensaje: 'La cuenta se creó correctamente. Ya puedes iniciar sesión.' };
    },
  };
}

module.exports = { crearAuthService };
