// Validaciones del servidor para PRODUCTO (sección 4.5 del contrato).
const { solicitudIncorrecta } = require('../errors/ApiError');
const { UNIDADES } = require('../models/constantes');
const { esFechaValida } = require('../utils/fechas');
const { MAXIMO, tieneMaximoDosDecimales } = require('../utils/numeros');
const { exigirObjeto, textoDeQuery } = require('./comunes');

// Sirve para POST y PUT. Los campos id, stockActual, activo y createdAt que
// el cliente envíe se IGNORAN: el stock solo cambia con movimientos.
function validarProducto(cuerpo) {
  exigirObjeto(cuerpo);
  const errores = [];

  // nombre: obligatorio, 2 a 100 caracteres
  let nombre = cuerpo.nombre;
  if (typeof nombre !== 'string' || nombre.trim() === '') {
    errores.push('El nombre es obligatorio.');
  } else {
    nombre = nombre.trim();
    if (nombre.length < 2 || nombre.length > 100) {
      errores.push('El nombre debe tener entre 2 y 100 caracteres.');
    }
  }

  // categoria: obligatoria
  let categoria = cuerpo.categoria;
  if (typeof categoria !== 'string' || categoria.trim() === '') {
    errores.push('La categoría es obligatoria.');
  } else {
    categoria = categoria.trim();
    if (categoria.length > 50) errores.push('La categoría no puede superar 50 caracteres.');
  }

  // unidad: solo kg, litros o unidades
  const unidad = cuerpo.unidad;
  if (typeof unidad !== 'string' || unidad.trim() === '') {
    errores.push('La unidad es obligatoria (kg, litros o unidades).');
  } else if (!UNIDADES.includes(unidad.trim())) {
    errores.push('La unidad debe ser kg, litros o unidades.');
  }

  // stockMinimo: número >= 0 (por defecto 0)
  let stockMinimo = cuerpo.stockMinimo;
  if (stockMinimo === undefined || stockMinimo === null) {
    stockMinimo = 0;
  } else if (typeof stockMinimo !== 'number' || !Number.isFinite(stockMinimo) || stockMinimo < 0) {
    errores.push('El stock mínimo debe ser un número mayor o igual a 0.');
  } else if (!tieneMaximoDosDecimales(stockMinimo) || stockMinimo > MAXIMO) {
    errores.push('El stock mínimo admite máximo 2 decimales y no puede superar 99999999.99.');
  }

  // fechaVencimiento: opcional, formato AAAA-MM-DD válido
  let fechaVencimiento = cuerpo.fechaVencimiento;
  if (fechaVencimiento === undefined || fechaVencimiento === null || fechaVencimiento === '') {
    fechaVencimiento = null;
  } else if (!esFechaValida(fechaVencimiento)) {
    errores.push('La fecha de vencimiento no es válida. Use el formato AAAA-MM-DD.');
  }

  if (errores.length) throw solicitudIncorrecta(errores.join(' '));

  return { nombre, categoria, unidad: unidad.trim(), stockMinimo, fechaVencimiento };
}

// Filtros de GET /api/productos
function validarFiltrosListado(query) {
  const buscar = textoDeQuery(query.buscar, 'buscar');
  const categoria = textoDeQuery(query.categoria, 'categoria');
  const activoTexto = textoDeQuery(query.activo, 'activo');

  let activo = true; // por defecto: solo productos activos
  if (activoTexto !== undefined) {
    if (activoTexto === 'true') activo = true;
    else if (activoTexto === 'false') activo = false;
    else throw solicitudIncorrecta('El parámetro activo debe ser true o false.');
  }
  return {
    activo,
    buscar: buscar && buscar.trim() !== '' ? buscar.trim() : undefined,
    categoria: categoria && categoria.trim() !== '' ? categoria.trim() : undefined,
  };
}

// dias de GET /api/productos/por-vencer?dias=7 (entero positivo, 7 por defecto)
function validarDias(query) {
  const texto = textoDeQuery(query.dias, 'dias');
  if (texto === undefined) return 7;
  if (!/^\d+$/.test(texto) || Number(texto) < 1 || Number(texto) > 36500) {
    throw solicitudIncorrecta('El parámetro dias debe ser un número entero positivo (entre 1 y 36500).');
  }
  return Number(texto);
}

module.exports = { validarProducto, validarFiltrosListado, validarDias };
