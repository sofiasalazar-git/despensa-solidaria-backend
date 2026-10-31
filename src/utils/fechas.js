// Utilidades de fechas. Formato ISO 8601 sin zona horaria, como en el contrato:
//   fecha:           2026-11-30
//   fecha y hora:    2026-09-28T10:30:00
const pad = (n) => String(n).padStart(2, '0');

function formatoFecha(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatoFechaHora(d) {
  return `${formatoFecha(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const hoy = () => formatoFecha(new Date());
const ahora = () => formatoFechaHora(new Date());

function sumarDias(fechaISO, dias) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  return formatoFecha(new Date(y, m - 1, d + dias));
}

// Valida que sea AAAA-MM-DD y que exista en el calendario (rechaza 2026-02-30).
function esFechaValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [y, m, d] = texto.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  return f.getFullYear() === y && f.getMonth() === m - 1 && f.getDate() === d;
}

function esFechaHoraValida(texto) {
  const r = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(texto);
  if (!r || !esFechaValida(r[1])) return false;
  return Number(r[2]) < 24 && Number(r[3]) < 60 && (r[4] === undefined || Number(r[4]) < 60);
}

// Convierte un filtro "desde"/"hasta" (fecha o fecha-hora) a fecha-hora completa.
// desde=2026-10-01 -> 2026-10-01T00:00:00 ; hasta=2026-10-01 -> 2026-10-01T23:59:59
function limiteDeFiltro(texto, esHasta) {
  if (typeof texto !== 'string') return null;
  if (esFechaValida(texto)) return `${texto}T${esHasta ? '23:59:59' : '00:00:00'}`;
  if (esFechaHoraValida(texto)) {
    return texto.length === 16 ? `${texto}:${esHasta ? '59' : '00'}` : texto;
  }
  return null;
}

module.exports = { hoy, ahora, sumarDias, esFechaValida, esFechaHoraValida, limiteDeFiltro };
