const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { iniciarServidor, crearProducto, registrar } = require('./ayuda/servidor');
const { hoy, sumarDias } = require('../src/utils/fechas');

describe('Productos', () => {
  let s;
  beforeEach(async () => { s = await iniciarServidor(); });
  afterEach(async () => { await s.cerrar(); });

  describe('POST /api/productos', () => {
    it('crea un producto válido: 201, stock inicial 0 y activo', async () => {
      const r = await s.api('POST', '/productos', {
        nombre: 'Arroz', categoria: 'Granos', unidad: 'kg', stockMinimo: 5, fechaVencimiento: '2026-11-30',
      });
      assert.equal(r.status, 201);
      assert.match(r.cabeceras.get('content-type'), /application\/json/);
      assert.equal(r.cuerpo.nombre, 'Arroz');
      assert.equal(r.cuerpo.stockActual, 0);
      assert.equal(r.cuerpo.stockMinimo, 5);
      assert.equal(r.cuerpo.fechaVencimiento, '2026-11-30');
      assert.equal(r.cuerpo.activo, true);
      assert.ok(Number.isInteger(r.cuerpo.id));
      assert.match(r.cuerpo.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });

    it('ignora un stockActual enviado por el cliente (el stock solo cambia con movimientos)', async () => {
      const r = await s.api('POST', '/productos', { nombre: 'Frijol', categoria: 'Granos', unidad: 'kg', stockActual: 500 });
      assert.equal(r.status, 201);
      assert.equal(r.cuerpo.stockActual, 0);
    });

    it('usa valores por defecto: stockMinimo 0 y fechaVencimiento nula', async () => {
      const r = await s.api('POST', '/productos', { nombre: 'Sal', categoria: 'Otros', unidad: 'kg' });
      assert.equal(r.status, 201);
      assert.equal(r.cuerpo.stockMinimo, 0);
      assert.equal(r.cuerpo.fechaVencimiento, null);
    });

    const invalidos = [
      ['sin nombre', { categoria: 'Granos', unidad: 'kg' }],
      ['nombre de 1 carácter', { nombre: 'A', categoria: 'Granos', unidad: 'kg' }],
      ['nombre de 101 caracteres', { nombre: 'x'.repeat(101), categoria: 'Granos', unidad: 'kg' }],
      ['nombre solo con espacios', { nombre: '   ', categoria: 'Granos', unidad: 'kg' }],
      ['sin categoría', { nombre: 'Arroz', unidad: 'kg' }],
      ['sin unidad', { nombre: 'Arroz', categoria: 'Granos' }],
      ['unidad inválida', { nombre: 'Arroz', categoria: 'Granos', unidad: 'libras' }],
      ['stockMinimo negativo', { nombre: 'Arroz', categoria: 'Granos', unidad: 'kg', stockMinimo: -1 }],
      ['stockMinimo no numérico', { nombre: 'Arroz', categoria: 'Granos', unidad: 'kg', stockMinimo: 'mucho' }],
      ['fecha con formato incorrecto', { nombre: 'Arroz', categoria: 'Granos', unidad: 'kg', fechaVencimiento: '30/11/2026' }],
      ['fecha inexistente en el calendario', { nombre: 'Arroz', categoria: 'Granos', unidad: 'kg', fechaVencimiento: '2026-02-30' }],
    ];
    for (const [descripcion, cuerpo] of invalidos) {
      it(`rechaza con 400: ${descripcion}`, async () => {
        const r = await s.api('POST', '/productos', cuerpo);
        assert.equal(r.status, 400);
        assert.equal(r.cuerpo.status, 400);
        assert.ok(r.cuerpo.mensaje.length > 0);
        assert.equal((await s.api('GET', '/productos')).cuerpo.length, 0, 'no debe guardarse nada');
      });
    }

    it('rechaza con 400 un cuerpo que no es un objeto JSON', async () => {
      const r = await s.api('POST', '/productos', []);
      assert.equal(r.status, 400);
    });

    it('rechaza nombres duplicados con 409 (sin distinguir mayúsculas ni tildes)', async () => {
      await s.api('POST', '/productos', { nombre: 'Atún', categoria: 'Enlatados', unidad: 'unidades' });
      for (const nombre of ['Atún', 'ATÚN', 'atun', '  Atun  ']) {
        const r = await s.api('POST', '/productos', { nombre, categoria: 'Enlatados', unidad: 'unidades' });
        assert.equal(r.status, 409, `nombre "${nombre}"`);
        assert.equal(r.cuerpo.mensaje, 'Ya existe un producto con ese nombre.');
      }
      assert.equal((await s.api('GET', '/productos')).cuerpo.length, 1);
    });
  });

  describe('GET /api/productos', () => {
    beforeEach(async () => {
      await crearProducto(s.api, { nombre: 'Arroz', categoria: 'Granos' });
      await crearProducto(s.api, { nombre: 'Lentejas', categoria: 'Granos' });
      await crearProducto(s.api, { nombre: 'Leche', categoria: 'Lácteos', unidad: 'litros' });
      await crearProducto(s.api, { nombre: 'Atún enlatado', categoria: 'Enlatados', unidad: 'unidades' });
    });

    it('lista solo productos activos', async () => {
      const r = await s.api('GET', '/productos');
      assert.equal(r.status, 200);
      assert.equal(r.cuerpo.length, 4);
      assert.ok(r.cuerpo.every((p) => p.activo === true));
    });

    it('busca por nombre sin distinguir mayúsculas ni tildes', async () => {
      assert.deepEqual((await s.api('GET', '/productos?buscar=ARR')).cuerpo.map((p) => p.nombre), ['Arroz']);
      assert.deepEqual((await s.api('GET', '/productos?buscar=atun')).cuerpo.map((p) => p.nombre), ['Atún enlatado']);
      assert.deepEqual((await s.api('GET', '/productos?buscar=le')).cuerpo.map((p) => p.nombre).sort(), ['Leche', 'Lentejas']);
      assert.deepEqual((await s.api('GET', '/productos?buscar=zzz')).cuerpo, []);
    });

    it('filtra por categoría (sin distinguir mayúsculas ni tildes)', async () => {
      assert.equal((await s.api('GET', '/productos?categoria=Granos')).cuerpo.length, 2);
      assert.deepEqual((await s.api('GET', '/productos?categoria=lacteos')).cuerpo.map((p) => p.nombre), ['Leche']);
    });

    it('combina buscar y categoría', async () => {
      const r = await s.api('GET', '/productos?categoria=Granos&buscar=len');
      assert.deepEqual(r.cuerpo.map((p) => p.nombre), ['Lentejas']);
    });

    it('activo=false lista los desactivados; un valor inválido da 400', async () => {
      const arroz = (await s.api('GET', '/productos?buscar=arroz')).cuerpo[0];
      await s.api('DELETE', `/productos/${arroz.id}`);
      assert.equal((await s.api('GET', '/productos')).cuerpo.length, 3);
      assert.deepEqual((await s.api('GET', '/productos?activo=false')).cuerpo.map((p) => p.nombre), ['Arroz']);
      assert.equal((await s.api('GET', '/productos?activo=quizas')).status, 400);
    });
  });

  describe('GET /api/productos/{id}', () => {
    it('devuelve el detalle con todos los campos del contrato', async () => {
      const p = await crearProducto(s.api, { fechaVencimiento: '2026-11-30' });
      const r = await s.api('GET', `/productos/${p.id}`);
      assert.equal(r.status, 200);
      assert.deepEqual(Object.keys(r.cuerpo).sort(),
        ['activo', 'categoria', 'createdAt', 'fechaVencimiento', 'id', 'nombre', 'stockActual', 'stockMinimo', 'unidad']);
    });
    it('404 si no existe', async () => {
      const r = await s.api('GET', '/productos/9999');
      assert.equal(r.status, 404);
      assert.equal(r.cuerpo.mensaje, 'No se encontró el producto con id 9999.');
    });
    for (const id of ['abc', '0', '-3', '1.5']) {
      it(`400 si el id no es un entero positivo (${id})`, async () => {
        assert.equal((await s.api('GET', `/productos/${id}`)).status, 400);
      });
    }
  });

  describe('PUT /api/productos/{id}', () => {
    it('actualiza los datos permitidos', async () => {
      const p = await crearProducto(s.api, { nombre: 'Arroz' });
      const r = await s.api('PUT', `/productos/${p.id}`, {
        nombre: 'Arroz integral', categoria: 'Granos', unidad: 'kg', stockMinimo: 8, fechaVencimiento: '2027-01-15',
      });
      assert.equal(r.status, 200);
      assert.equal(r.cuerpo.nombre, 'Arroz integral');
      assert.equal(r.cuerpo.stockMinimo, 8);
      assert.equal(r.cuerpo.fechaVencimiento, '2027-01-15');
      assert.equal((await s.api('GET', `/productos/${p.id}`)).cuerpo.nombre, 'Arroz integral');
    });

    it('NO modifica el stock actual aunque el cliente lo envíe', async () => {
      const p = await crearProducto(s.api);
      await registrar(s.api, p.id, 'ENTRADA', 10);
      const r = await s.api('PUT', `/productos/${p.id}`, {
        nombre: p.nombre, categoria: 'Granos', unidad: 'kg', stockMinimo: 1, stockActual: 999, activo: false,
      });
      assert.equal(r.status, 200);
      assert.equal(r.cuerpo.stockActual, 10);
      assert.equal(r.cuerpo.activo, true);
      assert.equal((await s.api('GET', `/productos/${p.id}`)).cuerpo.stockActual, 10);
    });

    it('permite conservar el mismo nombre del propio producto', async () => {
      const p = await crearProducto(s.api, { nombre: 'Arroz' });
      const r = await s.api('PUT', `/productos/${p.id}`, { nombre: 'Arroz', categoria: 'Otros', unidad: 'kg' });
      assert.equal(r.status, 200);
    });

    it('409 si el nombre ya lo usa otro producto', async () => {
      await crearProducto(s.api, { nombre: 'Arroz' });
      const b = await crearProducto(s.api, { nombre: 'Lentejas' });
      const r = await s.api('PUT', `/productos/${b.id}`, { nombre: 'arroz', categoria: 'Granos', unidad: 'kg' });
      assert.equal(r.status, 409);
      assert.equal((await s.api('GET', `/productos/${b.id}`)).cuerpo.nombre, 'Lentejas');
    });

    it('404 si no existe y 400 si los datos son inválidos', async () => {
      assert.equal((await s.api('PUT', '/productos/9999', { nombre: 'Algo', categoria: 'x', unidad: 'kg' })).status, 404);
      const p = await crearProducto(s.api);
      assert.equal((await s.api('PUT', `/productos/${p.id}`, { nombre: 'Algo', categoria: 'x', unidad: 'galones' })).status, 400);
    });
  });

  describe('DELETE /api/productos/{id} (desactivación)', () => {
    it('responde 204 sin cuerpo y desactiva sin borrar físicamente', async () => {
      const p = await crearProducto(s.api);
      await registrar(s.api, p.id, 'ENTRADA', 3);
      const r = await s.api('DELETE', `/productos/${p.id}`);
      assert.equal(r.status, 204);
      assert.equal(r.texto, '');
      assert.equal((await s.api('GET', '/productos')).cuerpo.length, 0);
      const detalle = await s.api('GET', `/productos/${p.id}`);
      assert.equal(detalle.status, 200);
      assert.equal(detalle.cuerpo.activo, false);
      assert.equal(detalle.cuerpo.stockActual, 3);
      // el historial se conserva
      assert.equal((await s.api('GET', `/movimientos?productoId=${p.id}`)).cuerpo.length, 1);
      assert.equal(await s.db.productos.countDocuments({}), 1);
    });
    it('404 si no existe', async () => {
      assert.equal((await s.api('DELETE', '/productos/9999')).status, 404);
    });
  });

  describe('GET /api/productos/por-vencer', () => {
    async function prepararVencimientos() {
      const mk = (nombre, fecha) => crearProducto(s.api, { nombre, fechaVencimiento: fecha });
      await mk('Ayer', sumarDias(hoy(), -1));
      await mk('Hoy', hoy());
      await mk('En 3 días', sumarDias(hoy(), 3));
      await mk('En 7 días', sumarDias(hoy(), 7));
      await mk('En 8 días', sumarDias(hoy(), 8));
      await mk('En 30 días', sumarDias(hoy(), 30));
      await crearProducto(s.api, { nombre: 'Sin vencimiento' });
      const inactivo = await mk('Inactivo en 2 días', sumarDias(hoy(), 2));
      await s.api('DELETE', `/productos/${inactivo.id}`);
    }

    it('usa 7 días por defecto: incluye hoy y hoy+7, excluye vencidos, más lejanos, sin fecha e inactivos', async () => {
      await prepararVencimientos();
      const r = await s.api('GET', '/productos/por-vencer');
      assert.equal(r.status, 200);
      assert.deepEqual(r.cuerpo.map((p) => p.nombre), ['Hoy', 'En 3 días', 'En 7 días']);
    });

    it('respeta el parámetro dias', async () => {
      await prepararVencimientos();
      assert.deepEqual((await s.api('GET', '/productos/por-vencer?dias=1')).cuerpo.map((p) => p.nombre), ['Hoy']);
      assert.deepEqual((await s.api('GET', '/productos/por-vencer?dias=8')).cuerpo.map((p) => p.nombre),
        ['Hoy', 'En 3 días', 'En 7 días', 'En 8 días']);
      assert.equal((await s.api('GET', '/productos/por-vencer?dias=30')).cuerpo.length, 5);
    });

    for (const dias of ['0', '-5', 'abc', '1.5', '', '40000']) {
      it(`400 con dias inválido (${JSON.stringify(dias)})`, async () => {
        const r = await s.api('GET', `/productos/por-vencer?dias=${dias}`);
        assert.equal(r.status, 400);
      });
    }
  });

  describe('GET /api/productos/bajo-stock', () => {
    it('incluye activos con stock <= mínimo (igual cuenta) y excluye los demás', async () => {
      const igual = await crearProducto(s.api, { nombre: 'Igual al mínimo', stockMinimo: 5 });
      await registrar(s.api, igual.id, 'ENTRADA', 5);
      const encima = await crearProducto(s.api, { nombre: 'Por encima', stockMinimo: 5 });
      await registrar(s.api, encima.id, 'ENTRADA', 6);
      await crearProducto(s.api, { nombre: 'Mínimo cero y stock cero', stockMinimo: 0 });
      const inactivo = await crearProducto(s.api, { nombre: 'Inactivo bajo', stockMinimo: 9 });
      await s.api('DELETE', `/productos/${inactivo.id}`);

      const r = await s.api('GET', '/productos/bajo-stock');
      assert.equal(r.status, 200);
      assert.deepEqual(r.cuerpo.map((p) => p.nombre).sort(), ['Igual al mínimo', 'Mínimo cero y stock cero']);
    });

    it('un producto sale de la lista cuando una entrada supera el mínimo', async () => {
      const p = await crearProducto(s.api, { stockMinimo: 5 });
      assert.equal((await s.api('GET', '/productos/bajo-stock')).cuerpo.length, 1);
      await registrar(s.api, p.id, 'ENTRADA', 20);
      assert.equal((await s.api('GET', '/productos/bajo-stock')).cuerpo.length, 0);
    });
  });
});
