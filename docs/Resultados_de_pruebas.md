# Resultados de las pruebas – Despensa Solidaria (Etapa 3: Backend)

Resultados obtenidos después de migrar la persistencia a MongoDB.

## 1. Pruebas automatizadas (`npm test`)

Se ejecutaron con Node.js v24.21.0, MongoDB 8.3.7 en un replica set local de pruebas y el driver oficial `mongodb` 6.21.0.

| Archivo | Qué comprueba |
|---|---|
| `productos.test.js` | Crear, validaciones, duplicados, listar/buscar/filtrar, detalle, PUT sin tocar stock, desactivar, alertas por vencer y bajo stock |
| `movimientos.test.js` | Entradas/salidas, validaciones, decimales, exceso de stock, rollback de stock si MongoDB rechaza el movimiento, concurrencia, filtros, PATCH y 405 |
| `baseDeDatos.test.js` | Índices, validación de documentos y persistencia al cerrar/reconectar |
| `errores.test.js` | Formato uniforme de errores |

**Resultado:** 63 pruebas aprobadas, 0 fallidas.

Pruebas clave:

* Una salida superior al stock devuelve HTTP 409; el inventario y el historial no cambian.
* Se forzó un rechazo del documento de movimiento dentro de la transacción; MongoDB revirtió también el cambio de stock.
* 25 salidas simultáneas de 1 unidad con stock 10: exactamente 10 se aceptaron, 15 se rechazaron y el stock terminó en 0.
* Los datos persistieron después de cerrar y volver a conectar al mismo nombre de base de datos.

## 2. Colección de Postman

La colección de 64 solicitudes sigue en `postman/`, pero **no se volvió a ejecutar después de la migración a MongoDB**. Ejecútela con el servidor MongoDB configurado como replica set y actualice el resultado aquí antes de entregar.

## 3. Datos SQLite anteriores

La migración de código no modifica ni importa `data/despensa.db`. La nueva API usa `MONGO_DB_NAME` y carga datos de prueba si la colección MongoDB está vacía. El archivo SQLite queda intacto como respaldo local.

## 4. Limitaciones de esta verificación

* Las pruebas se ejecutaron en macOS con un replica set local de un solo nodo; no se comprobó MongoDB Atlas, Windows ni otras versiones de Node.
* No se volvió a ejecutar la colección Postman ni se probó la conexión desde la app Android (Etapa 4).
