// Validaciones compartidas.
const { solicitudIncorrecta } = require('../errors/ApiError');

// El cuerpo de la petición debe ser un objeto JSON ({ ... }).
function exigirObjeto(cuerpo) {
  if (cuerpo === null || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
    throw solicitudIncorrecta('El cuerpo de la petición debe ser un objeto JSON.');
  }
  return cuerpo;
}

// Convierte el {id} de la ruta en número entero positivo o responde 400.
function leerId(texto) {
  if (!/^\d+$/.test(String(texto))) {
    throw solicitudIncorrecta('El id debe ser un número entero positivo.');
  }
  const id = Number(texto);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw solicitudIncorrecta('El id debe ser un número entero positivo.');
  }
  return id;
}

// Un parámetro de la URL debe venir una sola vez y como texto.
function textoDeQuery(valor, nombre) {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string') {
    throw solicitudIncorrecta(`El parámetro ${nombre} debe enviarse una sola vez como texto.`);
  }
  return valor;
}

module.exports = { exigirObjeto, leerId, textoDeQuery };
