// Convierte una fila de la tabla movimiento al JSON del contrato.
function aMovimientoDto(fila, stockResultante) {
  if (!fila) return null;
  const dto = {
    id: fila.id,
    productoId: fila.producto_id,
    tipo: fila.tipo,
    cantidad: fila.cantidad,
    fecha: fila.fecha,
    responsable: fila.responsable,
    observacion: fila.observacion,
  };
  // Solo el POST informa el stock que quedó después del movimiento.
  if (stockResultante !== undefined) dto.stockResultante = stockResultante;
  return dto;
}

module.exports = { aMovimientoDto };
