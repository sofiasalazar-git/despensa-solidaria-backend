const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const COSTO_SCRYPT = 16384;
const BYTES_CLAVE = 64;
const EMISOR = 'despensa-solidaria-api';

async function crearHash(password) {
  const salt = crypto.randomBytes(16);
  const clave = await scrypt(password, salt, BYTES_CLAVE, { N: COSTO_SCRYPT, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${COSTO_SCRYPT}$8$1$${salt.toString('base64url')}$${clave.toString('base64url')}`;
}

async function verificarPassword(password, hash) {
  try {
    const [algoritmo, n, r, p, saltTexto, claveTexto] = hash.split('$');
    if (algoritmo !== 'scrypt') return false;
    const salt = Buffer.from(saltTexto, 'base64url');
    const claveEsperada = Buffer.from(claveTexto, 'base64url');
    if (salt.length !== 16 || claveEsperada.length !== BYTES_CLAVE) return false;
    const clave = await scrypt(password, salt, claveEsperada.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(clave, claveEsperada);
  } catch {
    return false;
  }
}

function duracionSegundos(valor) {
  const match = /^(\d+)(s|m|h|d)$/.exec(valor);
  if (!match) throw new Error('JWT_TTL debe tener formato como 30m, 8h o 1d.');
  const unidad = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
  const segundos = Number(match[1]) * unidad;
  if (!Number.isSafeInteger(segundos) || segundos < 60 || segundos > 365 * 86400) {
    throw new Error('JWT_TTL debe estar entre 1 minuto y 365 días.');
  }
  return segundos;
}

function crearToken(usuario, secreto, ttl = '8h') {
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const carga = Buffer.from(JSON.stringify({
    sub: usuario.email,
    email: usuario.email,
    nombre: usuario.nombre || usuario.email.split('@')[0],
    iss: EMISOR,
    iat: ahora,
    exp: ahora + duracionSegundos(ttl),
  })).toString('base64url');
  const contenido = `${cabecera}.${carga}`;
  const firma = crypto.createHmac('sha256', secreto).update(contenido).digest('base64url');
  return `${contenido}.${firma}`;
}

function validarToken(token, secreto) {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const [cabeceraTexto, cargaTexto, firmaTexto] = partes;
  const firma = crypto.createHmac('sha256', secreto).update(`${cabeceraTexto}.${cargaTexto}`).digest();
  let firmaRecibida;
  let cabecera;
  let carga;
  try {
    firmaRecibida = Buffer.from(firmaTexto, 'base64url');
    cabecera = JSON.parse(Buffer.from(cabeceraTexto, 'base64url').toString('utf8'));
    carga = JSON.parse(Buffer.from(cargaTexto, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (cabecera.alg !== 'HS256' || cabecera.typ !== 'JWT') return null;
  if (firmaRecibida.length !== firma.length || !crypto.timingSafeEqual(firma, firmaRecibida)) return null;
  const ahora = Math.floor(Date.now() / 1000);
  if (carga.iss !== EMISOR || typeof carga.sub !== 'string' || !Number.isInteger(carga.exp) || carga.exp <= ahora) return null;
  return { email: carga.email, nombre: carga.nombre || carga.email.split('@')[0], sub: carga.sub, exp: carga.exp };
}

module.exports = { crearHash, verificarPassword, crearToken, validarToken, duracionSegundos };
