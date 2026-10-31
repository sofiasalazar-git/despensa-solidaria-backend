const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { iniciarServidor, crearProducto, registrar } = require('./ayuda/servidor');
const { hoy } = require('../src/utils/fechas');

const stockDe = async (s, id) => (await s.api('GET', `/productos/${id}`)).cuerpo.stockActual;
const totalMovimientos = (s) => s.db.movimientos.countDocuments({});

describe('Movimientos', () => {
  let s;
  beforeEach(async () => { s = await iniciarServidor(); });
  afterEach(async () => { await s.cerrar(); });

  it('una entrada y una salida actualizan el stock y registran el historial', async () => {
    const producto = await crearProducto(s.api);
    const entrada = await registrar(s.api, producto.id, 'ENTRADA', 12, { responsable: 'María' });
    const salida = await registrar(s.api, producto.id, 'SALIDA', 4);
    assert.equal(entrada.stockResultante, 12);
    assert.equal(salida.stockResultante, 8);
    assert.equal(await stockDe(s, producto.id), 8);
    assert.equal(await totalMovimientos(s), 2);
  });

  it('redondea correctamente cantidades con decimales', async () => {
    const producto = await crearProducto(s.api, { unidad: 'litros' });
    await registrar(s.api, producto.id, 'ENTRADA', 0.1);
    const entrada = await registrar(s.api, producto.id, 'ENTRADA', 0.2);
    assert.equal(entrada.stockResultante, 0.3);
    const salida = await registrar(s.api, producto.id, 'SALIDA', 0.3);
    assert.equal(salida.stockResultante, 0);
  });

  it('rechaza una salida mayor que el stock sin modificarlo ni guardar movimiento', async () => {
    const producto = await crearProducto(s.api);
    await registrar(s.api, producto.id, 'ENTRADA', 8);
    const antes = await totalMovimientos(s);
    const respuesta = await s.api('POST', '/movimientos', {
      productoId: producto.id, tipo: 'SALIDA', cantidad: 8.01, responsable: 'Ana',
    });
    assert.equal(respuesta.status, 409);
    assert.match(respuesta.cuerpo.mensaje, /Disponible: 8 kg, solicitado: 8.01 kg/);
    assert.equal(await stockDe(s, producto.id), 8);
    assert.equal(await totalMovimientos(s), antes);
  });

  it('revierte el stock si MongoDB rechaza el movimiento dentro de la transacción', async () => {
    const producto = await crearProducto(s.api);
    await registrar(s.api, producto.id, 'ENTRADA', 10);
    const info = await s.db.db.listCollections({ name: 'movimientos' }).next();
    const validator = info.options.validator;
    await s.db.db.command({
      collMod: 'movimientos',
      validator: { $and: [validator, { responsable: { $ne: 'FALLAR' } }] },
    });
    try {
      const antes = await totalMovimientos(s);
      const respuesta = await s.api('POST', '/movimientos', {
        productoId: producto.id, tipo: 'SALIDA', cantidad: 4, responsable: 'FALLAR',
      });
      assert.equal(respuesta.status, 500);
      assert.equal(respuesta.cuerpo.mensaje, 'Ocurrió un error interno. Intente de nuevo.');
      assert.equal(await stockDe(s, producto.id), 10);
      assert.equal(await totalMovimientos(s), antes);
    } finally {
      await s.db.db.command({ collMod: 'movimientos', validator });
    }
  });

  it('maneja movimientos simultáneos sin permitir stock negativo', async () => {
    const producto = await crearProducto(s.api);
    await registrar(s.api, producto.id, 'ENTRADA', 10);
    const respuestas = await Promise.all(Array.from({ length: 25 }, () =>
      s.api('POST', '/movimientos', {
        productoId: producto.id, tipo: 'SALIDA', cantidad: 1, responsable: 'Paralelo',
      })));
    assert.equal(respuestas.filter((r) => r.status === 201).length, 10);
    assert.equal(respuestas.filter((r) => r.status === 409).length, 15);
    assert.equal(await stockDe(s, producto.id), 0);
    assert.equal(await s.db.movimientos.countDocuments({ tipo: 'SALIDA' }), 10);
  });

  it('rechaza movimientos inválidos antes de tocar los datos', async () => {
    const producto = await crearProducto(s.api);
    const antes = await totalMovimientos(s);
    const respuesta = await s.api('POST', '/movimientos', {
      productoId: producto.id, tipo: 'ENTRADA', cantidad: 0, responsable: 'Ana',
    });
    assert.equal(respuesta.status, 400);
    assert.equal(await stockDe(s, producto.id), 0);
    assert.equal(await totalMovimientos(s), antes);
  });

  it('lista en orden reciente y permite filtrar por producto, tipo y fecha', async () => {
    const producto = await crearProducto(s.api);
    const entrada = await registrar(s.api, producto.id, 'ENTRADA', 10);
    const salida = await registrar(s.api, producto.id, 'SALIDA', 2);
    const todos = await s.api('GET', '/movimientos');
    assert.deepEqual(todos.cuerpo.map((m) => m.id), [salida.id, entrada.id]);
    assert.equal((await s.api('GET', `/movimientos?productoId=${producto.id}&tipo=SALIDA`)).cuerpo.length, 1);
    assert.equal((await s.api('GET', `/movimientos?desde=${hoy()}&hasta=${hoy()}`)).cuerpo.length, 2);
  });

  it('permite corregir solo responsable y observación, sin alterar stock', async () => {
    const producto = await crearProducto(s.api);
    const movimiento = await registrar(s.api, producto.id, 'ENTRADA', 10);
    const respuesta = await s.api('PATCH', `/movimientos/${movimiento.id}`, {
      responsable: 'Carlos', observacion: 'Donación',
    });
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.cuerpo.responsable, 'Carlos');
    assert.equal(respuesta.cuerpo.observacion, 'Donación');
    assert.equal(respuesta.cuerpo.cantidad, 10);
    assert.equal(await stockDe(s, producto.id), 10);
  });

  it('mantiene el historial: no permite borrar movimientos', async () => {
    const producto = await crearProducto(s.api);
    const movimiento = await registrar(s.api, producto.id, 'ENTRADA', 5);
    assert.equal((await s.api('DELETE', `/movimientos/${movimiento.id}`)).status, 405);
    assert.equal(await totalMovimientos(s), 1);
  });
});
