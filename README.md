# Despensa Solidaria – Backend (Etapa 3)

**Control de inventario de alimentos para un comedor comunitario**
Proyecto individual · Dispositivos Móviles · Docente: Zulema León · Periodo 2-2026
Estudiante: Laura Sofia Salazar Sandoval

API REST propia con base de datos persistente. Permite administrar los productos de la bodega de un comedor comunitario, registrar entradas y salidas y consultar alertas de productos por vencer o con bajo stock. La regla de negocio principal se valida **en el servidor**: una salida nunca puede dejar el stock en negativo.

> Todos los datos son ficticios (nombres de productos y personas de prueba).

---

## 1. Tecnologías utilizadas y por qué

| Componente | Tecnología |
|---|---|
| Lenguaje / entorno | Node.js (probado con v24.21.0; requiere 18 o superior) |
| Framework HTTP | Express 4 |
| Base de datos | MongoDB mediante el driver oficial `mongodb` |
| Pruebas automatizadas | Ejecutor de pruebas nativo de Node (`node --test`) |
| Pruebas de la API | Colección Postman (+ `newman` para ejecutarla por consola) |

**Por qué esta combinación.** La API conserva el contrato REST existente y persiste sus colecciones `productos`, `movimientos` y `counters` en MongoDB. Las operaciones que actualizan el stock y registran un movimiento usan transacciones; por eso MongoDB debe estar configurado como replica set (MongoDB Atlas ya lo está).

## 2. Requisitos previos

* [Node.js](https://nodejs.org) 18 o superior (recomendado la versión LTS). Verifique con `node -v` y `npm -v`.
* MongoDB Atlas o MongoDB local configurado como replica set, y `mongosh` para inicializar un replica set local.
* [Postman](https://www.postman.com/downloads/) (para importar la colección).
* Conexión a internet solo la primera vez (para `npm install`).

## 3. Estructura de carpetas

```
despensa-solidaria-backend/
├── package.json                 Dependencias y comandos (npm start / npm test)
├── README.md                    Este archivo
├── src/
│   ├── server.js                Punto de entrada (abre la BD y escucha el puerto)
│   ├── app.js                   Arma Express: rutas, JSON, errores
│   ├── composicion.js           Conecta repositorios y servicios
│   ├── config/config.js         Puerto y conexión a MongoDB (variables de entorno)
│   ├── routes/                  Rutas REST (productos, movimientos)
│   ├── controllers/             Traducen HTTP <-> servicios (sin lógica de negocio)
│   ├── services/                LÓGICA DE NEGOCIO (regla de stock, transacción)
│   ├── repositories/            Consultas y actualizaciones de MongoDB
│   ├── models/                  Entidades -> JSON del contrato (camelCase) y constantes
│   ├── validators/              Validaciones de entrada (400)
│   ├── middleware/              Manejo global de errores y 405
│   ├── errors/ApiError.js       Error controlado con código HTTP
│   ├── utils/                   Fechas y números
│   └── db/                      Conexión, validadores, datos de prueba y reinicio
├── tests/                       Pruebas automatizadas (*.test.js) y ayudas
├── postman/
│   ├── Despensa-Solidaria.postman_collection.json    Colección (64 solicitudes)
│   └── Despensa-Solidaria.postman_environment.json   Entorno (baseUrl)
└── docs/
    ├── Resultados_de_pruebas.md
    ├── Lista_de_verificacion_Etapa3.md
    └── Guia_de_demostracion.md
```

Flujo de una petición: `ruta → controlador → servicio (validador + regla de negocio) → repositorio → MongoDB`.

## 4. Configuración de la base de datos

1. Cree una base en MongoDB Atlas o inicie MongoDB local como replica set. Las transacciones **no funcionan en una instancia standalone**.
2. Copie `.env.example` a `.env` y configure `MONGO_URI` y `MONGO_DB_NAME`. No comparta ni suba el archivo `.env`.
3. Al iniciar, la API conecta con MongoDB, crea las colecciones e índices necesarios y aplica validación de documentos. Si no hay productos, carga datos de prueba ficticios (8 productos activos con movimientos y 1 desactivado).

Los datos se conservan en MongoDB entre reinicios. Para borrar las colecciones de esta base y volver a cargar los datos ficticios ejecute `npm run db:reset`; compruebe `MONGO_DB_NAME` antes de hacerlo. Para arrancar sin datos de prueba: `SEED_ON_START=false`.

La base local anterior `data/despensa.db` se conserva intacta, pero esta versión no la utiliza ni importa automáticamente sus registros.

## 5. Cómo ejecutar el backend (paso a paso)

```bash
# 1. Abra una terminal en la carpeta del proyecto
cd despensa-solidaria-backend

# 2. MongoDB local con Homebrew: edite /opt/homebrew/etc/mongod.conf y agregue:
#    replication:
#      replSetName: rs0
#    Luego ejecute brew services restart mongodb-community y, una sola vez:
#    mongosh "mongodb://127.0.0.1:27017/?directConnection=true" \
#      --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
#    Si ya usa Atlas, no necesita estos pasos.

# 3. Configure la conexión (copie .env.example a .env y ajuste los valores)

# 4. Instale las dependencias (solo la primera vez)
npm install

# 5. Inicie el servidor
npm start
```

Debe aparecer:

```
Despensa Solidaria - API REST en marcha
  URL base : http://localhost:8080/api
  MongoDB  : despensa_solidaria
```

Deje esa terminal abierta mientras prueba. Para detenerlo: `Ctrl + C`.

Prueba rápida (otra terminal o el navegador): <http://localhost:8080/api/productos>

La URL base <http://localhost:8080/api> devuelve un resumen de estado y los recursos disponibles; para consultar inventario, use `/api/productos`.

## 6. URL base de la API

`http://localhost:8080/api`

(Para la futura app Android: en el emulador, `localhost` del computador es `http://10.0.2.2:8080/api`; en un celular físico use la IP del computador en la red local.)

## 7. Variables de entorno (opcionales)

| Variable | Por defecto | Para qué sirve |
|---|---|---|
| `PORT` | `8080` | Puerto de la API |
| `HOST` | `0.0.0.0` | Interfaz de red donde escucha |
| `MONGO_URI` | `mongodb://127.0.0.1:27017` | URI de conexión local o de Atlas |
| `MONGO_DB_NAME` | `despensa_solidaria` | Nombre de la base de datos |
| `SEED_ON_START` | `true` | `false` = no cargar datos de prueba si la BD está vacía |

Ejemplos: Linux/macOS `PORT=9000 npm start` · Windows PowerShell `$env:PORT=9000; npm start` · Windows CMD `set PORT=9000 && npm start`.

## 8. Los 11 endpoints

Todas las peticiones y respuestas usan JSON (`Content-Type: application/json`), campos en camelCase y fechas ISO 8601 (`2026-11-30`, `2026-09-28T10:30:00`).

### Productos

| # | Método y ruta | Descripción | Respuestas |
|---|---|---|---|
| 1 | `GET /api/productos` | Lista productos **activos**. Parámetros opcionales: `buscar` (texto en el nombre), `categoria`, `activo` (`true`/`false`) | 200, 400 |
| 2 | `GET /api/productos/{id}` | Detalle de un producto | 200, 400, 404 |
| 3 | `POST /api/productos` | Crea un producto (stock inicial siempre 0) | 201, 400, 409 |
| 4 | `PUT /api/productos/{id}` | Edita nombre, categoría, unidad, stockMinimo y fechaVencimiento. **No** modifica el stock | 200, 400, 404, 409 |
| 5 | `DELETE /api/productos/{id}` | Desactiva el producto (eliminación lógica) | 204, 400, 404 |
| 6 | `GET /api/productos/por-vencer?dias=7` | Activos que vencen entre hoy y hoy + N días (7 por defecto) | 200, 400 |
| 7 | `GET /api/productos/bajo-stock` | Activos con `stockActual <= stockMinimo` | 200 |

### Movimientos

| # | Método y ruta | Descripción | Respuestas |
|---|---|---|---|
| 8 | `GET /api/movimientos` | Historial (más reciente primero). Filtros: `productoId`, `tipo`, `desde`, `hasta` | 200, 400 |
| 9 | `GET /api/movimientos/{id}` | Detalle de un movimiento | 200, 400, 404 |
| 10 | `POST /api/movimientos` | Registra ENTRADA o SALIDA y actualiza el stock (en una transacción) | 201, 400, 404, 409 |
| 11 | `PATCH /api/movimientos/{id}` | Corrige **solo** `responsable` y `observacion` | 200, 400, 404 |

Reglas de validación (servidor): nombre 2–100 caracteres y único (sin distinguir mayúsculas/tildes); categoría obligatoria (máx. 50); unidad `kg`, `litros` o `unidades`; `stockMinimo` ≥ 0; `fechaVencimiento` opcional en formato `AAAA-MM-DD`; `tipo` solo `ENTRADA` o `SALIDA`; `cantidad` número > 0 con máximo 2 decimales; `responsable` obligatorio (máx. 80); `observacion` opcional (máx. 200); `dias` entero positivo; `desde`/`hasta` fechas válidas (`AAAA-MM-DD` o `AAAA-MM-DDTHH:mm:ss`, el día completo es inclusivo) y `desde` no posterior a `hasta`.

## 9. Ejemplos de peticiones y respuestas

**POST /api/productos**

```json
{ "nombre": "Arroz", "categoria": "Granos", "unidad": "kg", "stockMinimo": 5, "fechaVencimiento": "2026-11-30" }
```
Respuesta `201 Created`:
```json
{ "id": 1, "nombre": "Arroz", "categoria": "Granos", "unidad": "kg", "stockActual": 0,
  "stockMinimo": 5, "fechaVencimiento": "2026-11-30", "activo": true, "createdAt": "2026-10-13T10:30:00" }
```

**POST /api/movimientos** (entrada)
```json
{ "productoId": 1, "tipo": "ENTRADA", "cantidad": 12, "responsable": "María", "observacion": "Donación de tienda" }
```
Respuesta `201 Created`:
```json
{ "id": 15, "productoId": 1, "tipo": "ENTRADA", "cantidad": 12, "fecha": "2026-10-13T10:31:00",
  "responsable": "María", "observacion": "Donación de tienda", "stockResultante": 12 }
```

**POST /api/movimientos** (salida mayor al stock) → `409 Conflict`
```json
{ "status": 409, "error": "Conflicto",
  "mensaje": "No hay existencia suficiente. Disponible: 12 kg, solicitado: 20 kg.",
  "timestamp": "2026-10-13T10:32:00" }
```

**PATCH /api/movimientos/15**
```json
{ "responsable": "María Pérez", "observacion": "Donación de la tienda del barrio" }
```
Respuesta `200 OK`: el movimiento completo con los textos corregidos (la cantidad, el tipo y el producto no cambian). Si el cuerpo trae `cantidad`, `tipo`, `productoId` u otro campo, responde `400`.

**GET /api/productos/por-vencer?dias=7** → `200` con una lista de productos (mismo formato de producto).
**GET /api/movimientos?productoId=1&tipo=SALIDA&desde=2026-10-01&hasta=2026-10-31** → `200` con una lista de movimientos.
**DELETE /api/productos/1** → `204 No Content` (sin cuerpo).

## 10. Códigos HTTP y manejo de errores

| Código | Cuándo |
|---|---|
| 200 OK | Consulta o actualización exitosa |
| 201 Created | Producto o movimiento creado |
| 204 No Content | Producto desactivado |
| 400 Bad Request | Datos inválidos, JSON mal formado, parámetros o id incorrectos |
| 404 Not Found | Producto, movimiento o ruta inexistente |
| 405 Method Not Allowed | Método no admitido en la ruta (por ejemplo `DELETE /api/movimientos/1`: el historial no se borra) |
| 409 Conflict | Regla de negocio (existencia insuficiente, producto desactivado) o nombre duplicado |
| 500 Internal Server Error | Falla inesperada (mensaje genérico; el detalle solo queda en la consola del servidor) |

Todos los errores tienen el mismo formato: `{ "status", "error", "mensaje", "timestamp" }`. Nunca se envían trazas internas ni detalles de la base de datos.

## 11. Colección de Postman

1. Con el backend en marcha (`npm start`), abra Postman.
2. **Import** → seleccione los dos archivos de la carpeta `postman/`:
   `Despensa-Solidaria.postman_collection.json` y `Despensa-Solidaria.postman_environment.json`.
3. En la esquina superior derecha elija el entorno **"Despensa Solidaria - Local"** (`baseUrl = http://localhost:8080/api`; si cambió el puerto, edítelo).
4. Clic derecho sobre la colección → **Run collection** (Collection Runner) → **Run**. **Ejecútela en orden**, completa: las carpetas se alimentan entre sí con variables.
5. Resultado esperado: **64 solicitudes y 190 pruebas (aserciones), todas en verde**. Se puede ejecutar varias veces seguidas (la primera solicitud genera un `runId` nuevo y evita nombres duplicados).

Contenido: carpeta *1. Productos* (21), *2. Movimientos y regla de negocio* (35) y *3. Desactivación de productos* (8). Cada solicitud tiene scripts de prueba automáticos (código HTTP, cuerpo, formato de error). Si ejecuta una solicitud suelta sin haber corrido antes la 1.1, las variables estarán vacías.

Por consola (opcional): `npx newman run postman/Despensa-Solidaria.postman_collection.json -e postman/Despensa-Solidaria.postman_environment.json`

## 12. Pruebas automatizadas

```bash
npm test
```

Las pruebas levantan la API en un puerto libre y crean una base MongoDB temporal por suite. MongoDB debe estar disponible y configurado como replica set:

* `productos.test.js`: crear, validar, duplicados, listar/buscar/filtrar, detalle, PUT (no toca el stock), desactivar, por-vencer (límites de fecha) y bajo-stock.
* `movimientos.test.js`: entradas y salidas, **salida mayor al stock → 409 sin cambiar el stock ni el historial**, validaciones, decimales, concurrencia (25 salidas simultáneas), filtros, PATCH y 405.
* `baseDeDatos.test.js`: índices y validadores de MongoDB, además de persistencia al reconectar.
* `errores.test.js`: formato uniforme de errores.

## 13. Datos de prueba y cómo verificar la regla de negocio

Con la base recién creada hay, entre otros: **Arroz** (id 1, 21 kg), **Lentejas** (id 2, 3 kg, bajo stock), **Leche** (id 3, vence en 4 días), **Pollo** (id 4, vence en 5 días y bajo stock), **Zanahoria** (id 5, vence en 2 días) y **Harina de trigo** (id 9, desactivada). Verificación en Postman o con `curl`:

```bash
# 1. Stock actual del arroz (21 kg)
curl http://localhost:8080/api/productos/1

# 2. Salida mayor al stock -> 409 con el mensaje
curl -i -X POST http://localhost:8080/api/movimientos -H "Content-Type: application/json" \
  -d '{"productoId":1,"tipo":"SALIDA","cantidad":50,"responsable":"María"}'

# 3. El stock NO cambió (sigue en 21)
curl http://localhost:8080/api/productos/1

# 4. Salida válida -> 201 y stockResultante 17
curl -X POST http://localhost:8080/api/movimientos -H "Content-Type: application/json" \
  -d '{"productoId":1,"tipo":"SALIDA","cantidad":4,"responsable":"María","observacion":"Almuerzo"}'
```
(En Windows CMD use comillas dobles escapadas o pruebe directamente con Postman.)

## 14. Decisiones de diseño y diferencias entre documentos

* **Tecnología:** ver sección 1. Los campos pendientes del documento Word (backend, BD, cliente HTTP) quedan definidos así para el backend; confirme con la profesora si exige otra.
* **Persistencia:** productos, movimientos y contadores usan colecciones MongoDB. El driver crea índices únicos y validadores de documentos al conectar.
* **Categoría:** la tabla de entidades lista ejemplos (Granos, Lácteos…) pero la tabla de validaciones (4.5) solo exige que sea obligatoria; se aceptó cualquier texto no vacío (máx. 50) para no restringir más de lo definido en el contrato.
* **`GET /api/productos`:** "lista productos activos" y a la vez admite el parámetro `activo`; por defecto devuelve solo activos y `activo=false` devuelve los desactivados.
* **`PUT` y stock:** el contrato dice que no modifica `stock_actual`; el campo `stockActual` (y `activo`, `id`, `createdAt`) que el cliente envíe se **ignora**, de modo que una app que reenvíe el objeto completo no falla.
* **Por vencer:** usa el criterio del documento (entre hoy y hoy + N); los ya vencidos no se incluyen. **Bajo stock:** `stockActual <= stockMinimo`; por eso un producto nuevo con mínimo 0 y stock 0 también aparece.
* **`405`:** el contrato no lista este código; se usa solo para métodos no admitidos (p. ej. borrar un movimiento) para dejar claro que el historial no se elimina.
* **`createdAt`** se incluye en la respuesta del producto (está en la entidad aunque no en el ejemplo del documento) y `stockResultante` solo en la respuesta del `POST /api/movimientos`.
* **Fechas de entrega:** la guía en PDF y el documento Word indican el lunes 12 de octubre para la Etapa 3, mientras que la captura de "Etapas y entregables" indica el martes 13 de octubre. Conviene confirmar la fecha vigente.
* **Zona horaria:** las fechas se generan con la hora local del computador donde corre el servidor.

## 15. Solución de problemas comunes

| Problema | Solución |
|---|---|
| `'npm' no se reconoce como un comando` | Instale Node.js y abra una terminal **nueva**. |
| Error `Transaction numbers are only allowed on a replica set member or mongos` | MongoDB está ejecutándose como standalone. Use Atlas o inicie el servidor local con `--replSet rs0` e inicialícelo con `mongosh --eval "rs.initiate()"`. |
| No se puede conectar con MongoDB | Revise que MongoDB esté activo y que `MONGO_URI` y `MONGO_DB_NAME` sean correctos en `.env`. |
| `El puerto 8080 ya está en uso` | Cierre el otro programa o use `PORT=8081 npm start` (y cambie `baseUrl` en el entorno de Postman). |
| Postman: `Could not get response / ECONNREFUSED` | El servidor no está iniciado o el puerto de `baseUrl` es otro. |
| Postman: errores 404/400 en solicitudes sueltas | Ejecute la colección completa en orden (Collection Runner); las variables `p1Id`, `mov1Id`… las llena la propia colección. |
| Quiero empezar de cero | Detenga el servidor y ejecute `npm run db:reset`. |
| Quiero empezar de cero | Verifique `MONGO_DB_NAME` y ejecute `npm run db:reset`; el comando elimina sus colecciones de productos, movimientos y contadores para reinicializarlas. |
