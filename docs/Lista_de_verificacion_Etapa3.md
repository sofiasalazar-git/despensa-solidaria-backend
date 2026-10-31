# Lista de verificación – Etapa 3: Backend

Evidencia mínima de la Etapa 3 (captura de "Etapas y entregables"): **Base de datos, endpoints probados y colección de pruebas (Postman/Insomnia o equivalente).**

## Evidencia mínima

- [x] Base de datos MongoDB persistente con dos colecciones relacionadas por `producto_id`: productos y movimientos
- [x] Endpoints comprobados: 63 pruebas automatizadas contra MongoDB; la colección Postman debe volver a ejecutarse después de la migración
- [x] Colección de pruebas importable: `postman/Despensa-Solidaria.postman_collection.json` + entorno

## Requisitos técnicos de la guía de la profesora (5.1)

- [x] Backend propio desarrollado por la estudiante *(tecnología: Node.js + Express + MongoDB; **pendiente confirmar con la profesora que es la autorizada en el curso**)*
- [x] Base de datos persistente
- [x] Mínimo dos entidades relacionadas (Producto, Movimiento)
- [x] CRUD completo sobre la entidad principal (crear, listar, detalle, editar, desactivar)
- [x] Operaciones suficientes sobre la entidad relacionada (listar, detalle, registrar, corregir)
- [x] Mínimo seis endpoints: **11**
- [x] Métodos GET, POST, PUT/PATCH y DELETE (se usan los cinco)
- [x] Consultas con parámetro/filtro: `buscar`, `categoria`, `activo`, `dias`, `productoId`, `tipo`, `desde`, `hasta`
- [x] Validaciones en el servidor (y restricciones en la base de datos)
- [x] Respuestas JSON y códigos 200, 201, 204, 400, 404, 409 y 500 (más 405 para métodos no admitidos)
- [x] Manejo de errores con mensajes comprensibles y formato uniforme
- [x] Regla de negocio comprobable: una salida nunca deja stock negativo (409)

## Requisitos de la solicitud

- [x] 11 endpoints del contrato (sección 4 del Word)
- [x] Reglas 1–12: cantidad > 0, tipo ENTRADA/SALIDA, responsable obligatorio, producto existente, sin movimientos en productos desactivados, salida ≤ stock, stock automático, stock no negativo, nombres únicos, el stock solo cambia con movimientos, alertas con los criterios del documento, correcciones restringidas (PATCH)
- [x] Movimiento + stock en una transacción; protección contra concurrencia
- [x] Estructura por capas: rutas, controladores, servicios, repositorios, modelos/DTO, validadores, manejo global de errores, configuración
- [x] Pruebas automatizadas con resultados reales
- [x] README en español con instrucciones
- [x] Documento de resultados reales de pruebas
- [x] ZIP descargable

## Pendientes / limitaciones

- [ ] Confirmar con la profesora la tecnología autorizada y la fecha de entrega (12 o 13 de octubre: la guía y el Word dicen lunes 12; la captura dice martes 13)
- [ ] Importar la colección en Postman (app) y ejecutarla una vez en su computador antes de la sustentación
- [ ] Subir el proyecto al repositorio (GitHub) — la entrega final lo exige
- [ ] Etapa 4: app Android (no incluida a propósito)
