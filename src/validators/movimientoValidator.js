// Validaciones del servidor para MOVIMIENTO (sección 4.5 del contrato).
const { solicitudIncorrecta } = require('../errors/ApiError');
const { TIPOS_MOVIMIENTO } = require('../models/constantes');
const { limiteDeFiltro } = require('../utils/fechas');
const { MAXIMO, tieneMaximoDosDecimales } = require('../utils/numeros');
const { exigirObjeto, textoDeQuery } = require('./comunes');

// POST /api/movimientos
function validarNuevoMovimiento(cuerpo) {
  exigirObjeto(cuerpo);
  const errores = [];

  const { productoId, tipo, cantidad, responsable, observacion } = cuerpo;

  if (!Number.isSafeInteger(productoId) || productoId < 1) {
    errores.push('El productoId es obligatorio y debe ser un número entero positivo.');
  }

  if (typeof tipo !== 'string' || !TIPOS_MOVIMIENTO.includes(tipo)) {
    errores.push('El tipo debe ser ENTRADA o SALIDA.');
  }

  if (typeof cantidad !== 'number' || !Number.isFinite(cantidad)) {
    errores.push('La cantidad es obligatoria y debe ser un número.');
  } else if (cantidad <= 0) {
    errores.push('La cantidad debe ser mayor que 0.');
  } else if (!tieneMaximoDosDecimales(cantidad) || cantidad > MAXIMO) {
    errores.push('La cantidad admite máximo 2 decimales y no puede superar 99999999.99.');
  }

  let responsableLimpio = responsable;
  if (typeof responsable !== 'string' || responsable.trim() === '') {
    errores.push('El responsable es obligatorio.');
  } else {
    responsableLimpio = responsable.trim();
    if (responsableLimpio.length > 80) errores.push('El responsable no puede superar 80 caracteres.');
  }

  let observacionLimpia = null;
  if (observacion !== undefined && observacion !== null) {
    if (typeof observacion !== 'string') {
      errores.push('La observación debe ser texto.');
    } else if (observacion.length > 200) {
      errores.push('La observación no puede superar 200 caracteres.');
    } else {
      observacionLimpia = observacion.trim() === '' ? null : observacion.trim();
    }
  }

  if (errores.length) throw solicitudIncorrecta(errores.join(' '));

  return { productoId, tipo, cantidad, responsable: responsableLimpio, observacion: observacionLimpia };
}

// PATCH /api/movimientos/{id}: solo responsable y observacion
const CAMPOS_CORREGIBLES = ['responsable', 'observacion'];

function validarCorreccion(cuerpo) {
  exigirObjeto(cuerpo);

  const claves = Object.keys(cuerpo);
  const noPermitidos = claves.filter((c) => !CAMPOS_CORREGIBLES.includes(c));
  if (noPermitidos.length) {
    throw solicitudIncorrecta(
      `Solo se pueden corregir el responsable y la observación. No se permite modificar: ${noPermitidos.join(', ')}.`
    );
  }
  if (claves.length === 0) {
    throw solicitudIncorrecta('Debe enviar al menos responsable u observacion.');
  }

  const errores = [];
  const datos = {};

  if (cuerpo.responsable !== undefined) {
    if (typeof cuerpo.responsable !== 'string' || cuerpo.responsable.trim() === '') {
      errores.push('El responsable es obligatorio y no puede estar vacío.');
    } else if (cuerpo.responsable.trim().length > 80) {
      errores.push('El responsable no puede superar 80 caracteres.');
    } else {
      datos.responsable = cuerpo.responsable.trim();
    }
  }

  if (cuerpo.observacion !== undefined) {
    if (cuerpo.observacion === null) {
      datos.observacion = null;
    } else if (typeof cuerpo.observacion !== 'string') {
      errores.push('La observación debe ser texto.');
    } else if (cuerpo.observacion.length > 200) {
      errores.push('La observación no puede superar 200 caracteres.');
    } else {
      datos.observacion = cuerpo.observacion.trim() === '' ? null : cuerpo.observacion.trim();
    }
  }

  if (errores.length) throw solicitudIncorrecta(errores.join(' '));
  return datos;
}

// Filtros de GET /api/movimientos
function validarFiltrosMovimientos(query) {
  const productoIdTexto = textoDeQuery(query.productoId, 'productoId');
  const tipo = textoDeQuery(query.tipo, 'tipo');
  const desdeTexto = textoDeQuery(query.desde, 'desde');
  const hastaTexto = textoDeQuery(query.hasta, 'hasta');
  const filtros = {};

  if (productoIdTexto !== undefined) {
    if (!/^\d+$/.test(productoIdTexto) || !Number.isSafeInteger(Number(productoIdTexto)) || Number(productoIdTexto) < 1) {
      throw solicitudIncorrecta('El parámetro productoId debe ser un número entero positivo.');
    }
    filtros.productoId = Number(productoIdTexto);
  }

  if (tipo !== undefined) {
    if (!TIPOS_MOVIMIENTO.includes(tipo)) {
      throw solicitudIncorrecta('El parámetro tipo debe ser ENTRADA o SALIDA.');
    }
    filtros.tipo = tipo;
  }

  if (desdeTexto !== undefined) {
    filtros.desde = limiteDeFiltro(desdeTexto, false);
    if (!filtros.desde) {
      throw solicitudIncorrecta('El parámetro desde no es una fecha válida. Use AAAA-MM-DD o AAAA-MM-DDTHH:mm:ss.');
    }
  }
  if (hastaTexto !== undefined) {
    filtros.hasta = limiteDeFiltro(hastaTexto, true);
    if (!filtros.hasta) {
      throw solicitudIncorrecta('El parámetro hasta no es una fecha válida. Use AAAA-MM-DD o AAAA-MM-DDTHH:mm:ss.');
    }
  }
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    throw solicitudIncorrecta('El parámetro desde no puede ser posterior a hasta.');
  }
  return filtros;
}

module.exports = { validarNuevoMovimiento, validarCorreccion, validarFiltrosMovimientos };
