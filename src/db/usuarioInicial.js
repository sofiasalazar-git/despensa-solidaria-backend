const { crearHash } = require('../auth/seguridad');
const { ahora } = require('../utils/fechas');

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function asegurarUsuarioInicial(db, credenciales) {
  if (await db.usuarios.countDocuments({}) > 0) return false;

  if (!credenciales.email || !credenciales.password) {
    if (!credenciales.email && !credenciales.password) return false;
    throw new Error('AUTH_INITIAL_EMAIL y AUTH_INITIAL_PASSWORD deben configurarse juntos.');
  }

  const email = credenciales.email.trim().toLowerCase();
  const password = credenciales.password;
  if (!EMAIL_VALIDO.test(email) || email.length > 254) {
    throw new Error('AUTH_INITIAL_EMAIL debe ser un correo electrónico válido.');
  }
  if (password.length < 10 || Buffer.byteLength(password, 'utf8') > 1024) {
    throw new Error('AUTH_INITIAL_PASSWORD debe tener al menos 10 caracteres.');
  }

  const passwordHash = await crearHash(password);
  try {
    await db.usuarios.insertOne({ _id: email, nombre: 'Administrador', email, password_hash: passwordHash, created_at: ahora() });
    console.log('Se creó el usuario inicial.');
    return true;
  } catch (error) {
    if (error.code === 11000 && await db.usuarios.countDocuments({}) > 0) return false;
    throw error;
  }
}

module.exports = { asegurarUsuarioInicial };
