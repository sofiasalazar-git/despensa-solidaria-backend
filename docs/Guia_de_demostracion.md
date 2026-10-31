# Guía paso a paso para demostrar la Etapa 3 ante la profesora

## Antes de la sustentación (10 minutos)

1. Instale Node.js LTS (si no lo tiene) y abra una terminal en la carpeta `despensa-solidaria-backend`.
2. Configure `MONGO_URI` y `MONGO_DB_NAME` en `.env`; asegúrese de que MongoDB sea un replica set (Atlas ya cumple este requisito).
3. `npm install` (una vez) y `npm test` → ejecute las pruebas contra la base MongoDB configurada.
4. `npm run db:reset` para dejar las colecciones configuradas con datos de prueba iniciales.
5. `npm start` → debe mostrar `API REST en marcha` y la URL `http://localhost:8080/api`.
6. En Postman: importe la colección y el entorno (carpeta `postman/`), elija el entorno **Despensa Solidaria - Local** y ejecute la colección completa una vez.

## Demostración sugerida (5–7 minutos)

1. **Presente la arquitectura** (30 s): rutas → controlador → servicio (regla de negocio) → repositorio → MongoDB. Muestre las colecciones `productos` y `movimientos`, sus validadores e índices.
2. **Productos** (1 min): `POST /api/productos` (crear), `GET /api/productos?buscar=arr` (búsqueda), `PUT` (editar) y `DELETE` (desactivar → 204; el producto ya no aparece en el listado pero conserva su historial).
3. **Regla principal** (2 min):
   * `GET /api/productos/1` → stock 21 kg.
   * `POST /api/movimientos` con SALIDA de 50 → **409** con el mensaje "No hay existencia suficiente. Disponible: 21 kg, solicitado: 50 kg."
   * `GET /api/productos/1` → el stock **sigue en 21** (y el movimiento no quedó en el historial).
   * `POST /api/movimientos` con SALIDA de 4 → 201 y `stockResultante: 17`.
4. **Validaciones** (1 min): cantidad 0 → 400; tipo `TRANSFERENCIA` → 400; producto 99999 → 404; movimiento sobre un producto desactivado → 409.
5. **Alertas** (30 s): `GET /api/productos/por-vencer?dias=7` y `GET /api/productos/bajo-stock`.
6. **Auditoría** (30 s): `PATCH /api/movimientos/{id}` corrige responsable/observación; con `cantidad` → 400; `DELETE /api/movimientos/{id}` → 405.
7. **Persistencia** (30 s): detenga el servidor (`Ctrl + C`), vuelva a iniciarlo y repita `GET /api/productos`: los datos siguen ahí.
8. **Pruebas automáticas** (30 s): muestre `npm test` (63 aprobadas), incluidas atomicidad y concurrencia.

## Preguntas que puede hacer la profesora (y cómo responder)

* **¿Dónde se valida que no haya stock negativo?** En `src/services/movimientoService.js`, en la actualización condicional del repositorio (`aplicarSalida`) y en la transacción de MongoDB que guarda conjuntamente el stock y el movimiento.
* **¿Qué pasa si dos personas sacan lo mismo a la vez?** Las operaciones usan transacciones MongoDB; los conflictos concurrentes se reintentan y vuelven a validar el stock actualizado. Se requiere un replica set.
* **¿Por qué DELETE no borra?** Para conservar el historial; es una eliminación lógica (`activo = false`).
* **¿Por qué el PUT no cambia el stock?** El stock solo cambia con movimientos, para que el inventario siempre coincida con el historial.
* **¿Por qué Node + MongoDB?** La API usa el driver oficial y conserva el contrato REST; confirme con la profesora que MongoDB es una tecnología autorizada en el curso.
