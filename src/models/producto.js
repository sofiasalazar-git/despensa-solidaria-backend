// Convierte una fila de la tabla producto (snake_case) al JSON del contrato (camelCase).
function aProductoDto(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    nombre: fila.nombre,
    categoria: fila.categoria,
    unidad: fila.unidad,
    stockActual: fila.stock_actual,
    stockMinimo: fila.stock_minimo,
    fechaVencimiento: fila.fecha_vencimiento,
    activo: fila.activo === 1,
    createdAt: fila.created_at,
  };
}

module.exports = { aProductoDto };
