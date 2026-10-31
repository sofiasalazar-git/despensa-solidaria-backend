const { randomUUID } = require('node:crypto');
const { abrirBaseDeDatos } = require('../../src/db/database');
const { crearApp } = require('../../src/app');
const config = require('../../src/config/config');

async function iniciarServidor() {
  const nombreDb = `${config.mongoDbName}_test_${process.pid}_${randomUUID().replace(/-/g, '')}`;
  const db = await abrirBaseDeDatos(config.mongoUri, nombreDb);
  const app = crearApp(db, { registrarErrores: false });
  const servidor = await new Promise((resolver, rechazar) => {
    const s = app.listen(0, '127.0.0.1', () => resolver(s));
    s.once('error', rechazar);
  });
  const base = `http://127.0.0.1:${servidor.address().port}/api`;

  async function api(metodo, ruta, cuerpo) {
    const opciones = { method: metodo, headers: {} };
    if (cuerpo !== undefined) {
      opciones.headers['Content-Type'] = 'application/json';
      opciones.body = typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo);
    }
    const respuesta = await fetch(base + ruta, opciones);
    const texto = await respuesta.text();
    let json = null;
    try { json = texto ? JSON.parse(texto) : null; } catch { json = null; }
    return { status: respuesta.status, cuerpo: json, texto, cabeceras: respuesta.headers };
  }

  async function cerrar() {
    await new Promise((resolver) => servidor.close(resolver));
    try {
      await db.db.dropDatabase();
    } finally {
      await db.close();
    }
  }

  return { db, base, api, cerrar };
}

let contador = 0;
async function crearProducto(api, extra = {}) {
  contador += 1;
  const res = await api('POST', '/productos', {
    nombre: `Producto de prueba ${contador}`,
    categoria: 'Granos',
    unidad: 'kg',
    stockMinimo: 0,
    ...extra,
  });
  if (res.status !== 201) throw new Error(`No se pudo crear el producto: ${res.texto}`);
  return res.cuerpo;
}

async function registrar(api, productoId, tipo, cantidad, extra = {}) {
  const res = await api('POST', '/movimientos', { productoId, tipo, cantidad, responsable: 'Tester', ...extra });
  if (res.status !== 201) throw new Error(`No se pudo registrar el movimiento: ${res.texto}`);
  return res.cuerpo;
}

module.exports = { iniciarServidor, crearProducto, registrar };
