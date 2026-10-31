// Utilidades numéricas (el stock y las cantidades son DECIMAL(10,2)).
const MAXIMO = 99999999.99;

const redondear2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// true si el número tiene como máximo 2 decimales
const tieneMaximoDosDecimales = (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

// Texto legible: 8 -> "8", 2.5 -> "2.5", 2.456 -> "2.46"
const formatear = (n) => String(Number(Number(n).toFixed(2)));

module.exports = { MAXIMO, redondear2, tieneMaximoDosDecimales, formatear };
