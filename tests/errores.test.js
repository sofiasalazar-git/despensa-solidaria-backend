const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciarServidor } = require('./ayuda/servidor');

describe('Formato uniforme de errores', () => {
  let s;
  before(async () => { s = await iniciarServidor(); });
  after(async () => { await s.cerrar(); });

  function esErrorUniforme(r, status) {
    assert.equal(r.status, status);
    assert.match(r.cabeceras.get('content-type'), /application\/json/);
    assert.deepEqual(Object.keys(r.cuerpo).sort(), ['error', 'mensaje', 'status', 'timestamp']);
    assert.equal(r.cuerpo.status, status);
    assert.equal(typeof r.cuerpo.error, 'string');
    assert.ok(r.cuerpo.mensaje.length > 5);
    assert.match(r.cuerpo.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  }

  it('GET /api confirma que la API está activa y muestra sus recursos', async () => {
    const r = await s.api('GET', '/');
    assert.equal(r.status, 200);
    assert.deepEqual(r.cuerpo, {
      nombre: 'Despensa Solidaria API',
      estado: 'en marcha',
      endpoints: ['/api/productos', '/api/movimientos'],
    });
  });

  it('GET /api/health confirma que la API y la base de datos están conectadas', async () => {
    const r = await s.api('GET', '/health');
    assert.equal(r.status, 200);
    assert.deepEqual(r.cuerpo, { status: 'ok', db: 'conectada' });
  });

  it('400 por validación', async () => {
    esErrorUniforme(await s.api('POST', '/productos', { nombre: 'A' }), 400);
  });
  it('400 por JSON mal formado', async () => {
    const r = await s.api('POST', '/productos', '{"nombre": "Arroz", ');
    esErrorUniforme(r, 400);
    assert.equal(r.cuerpo.mensaje, 'El cuerpo de la petición no es un JSON válido.');
  });
  it('400 cuando no se envía cuerpo', async () => {
    const r = await fetch(`${s.base}/movimientos`, { method: 'POST' });
    assert.equal(r.status, 400);
  });
  it('404 por producto, movimiento o ruta inexistente', async () => {
    esErrorUniforme(await s.api('GET', '/productos/9999'), 404);
    esErrorUniforme(await s.api('GET', '/movimientos/9999'), 404);
    esErrorUniforme(await s.api('GET', '/algo-que-no-existe'), 404);
  });
  it('405 por método no permitido', async () => {
    esErrorUniforme(await s.api('PATCH', '/productos'), 405);
    esErrorUniforme(await s.api('DELETE', '/movimientos'), 405);
    esErrorUniforme(await s.api('POST', '/productos/por-vencer', {}), 405);
  });
  it('409 por regla de negocio y por nombre duplicado', async () => {
    await s.api('POST', '/productos', { nombre: 'Arroz', categoria: 'Granos', unidad: 'kg' });
    esErrorUniforme(await s.api('POST', '/productos', { nombre: 'Arroz', categoria: 'Granos', unidad: 'kg' }), 409);
    esErrorUniforme(await s.api('POST', '/movimientos', { productoId: 1, tipo: 'SALIDA', cantidad: 5, responsable: 'Ana' }), 409);
  });
  it('las rutas fijas por-vencer y bajo-stock no se confunden con un id', async () => {
    assert.equal((await s.api('GET', '/productos/por-vencer')).status, 200);
    assert.equal((await s.api('GET', '/productos/bajo-stock')).status, 200);
  });
});
