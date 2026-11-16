# Documentación técnica — Ruta (Avance 60 %)

Ruta es un marketplace de autos usados. Un vendedor publica vehículos únicos (cada uno tiene patente).
Un comprador los busca, los guarda en su carrito e inicia una compra. La compra reserva el auto y luego se
paga al contado o en cuotas. Un asesor acompaña las compras pendientes y el administrador ve los reportes.

- **Motor:** Microsoft SQL Server 2022
- **Backend / API:** Node.js 20+ con Express 5 y el driver `mssql`. El SQL está escrito a mano y va
  parametrizado. **No hay ORM.**
- **Frontend:** Vite con JavaScript sin framework. Consume la API con `fetch` y nunca se conecta a la base.

Índice: [1. Arquitectura](#1-arquitectura) · [2. Modelo de datos](#2-modelo-de-datos) ·
[3. Objetos SQL](#3-objetos-sql) · [4. API](#4-api) · [5. Validación y seguridad](#5-validación-errores-y-seguridad) ·
[6. Pruebas](#6-pruebas) · [7. Entrega final: trigger y cursor](#7-entrega-final-trigger-y-cursor) ·
[8. Estado del avance](#8-estado-del-avance)

---

## 1. Arquitectura

```
┌──────────────────────┐   HTTP/JSON    ┌───────────────────────────────────────┐   TDS + SQL     ┌──────────────┐
│ Frontend (Vite)      │ ─────────────▶ │ Backend (Express)                      │ ──────────────▶ │ SQL Server   │
│ frontend/app.js      │   /api/...     │ routes → controllers → repositories    │  parametrizado  │ RutaDB       │
│ solo interfaz        │ ◀───────────── │ valida, aplica permisos, traduce errores│ ◀────────────── │ tablas, vistas│
└──────────────────────┘                └───────────────────────────────────────┘                 │ función, SP  │
                                                                                                   └──────────────┘
```

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Interfaz | `frontend/` | Pantallas, formularios y validaciones de usabilidad. Solo llama a `/api`. |
| Rutas | `backend/src/routes/index.js` | Define los endpoints y qué rol puede usar cada uno. |
| Controladores | `backend/src/controllers/` | Validan la entrada (tipos, largos, listas cerradas) y arman la respuesta. |
| Acceso a datos | `backend/src/repositories/` | **Todo el SQL de la aplicación**: consultas explícitas y `EXEC` de SP, siempre con `.input(nombre, tipo, valor)`. |
| Errores | `backend/src/middleware/errorHandler.js` | Traduce los errores de SQL Server a códigos HTTP. |
| Base de datos | `database/` | DDL, vistas, función, SP, datos de prueba y pruebas. |

Las credenciales de SQL Server están solo en `backend/.env`. El frontend no las conoce.

## 2. Modelo de datos

Script: [`database/01_schema.sql`](../database/01_schema.sql). Diagrama ER: [`modelo-relacional-objetivo.md`](modelo-relacional-objetivo.md)
(Mermaid) y [`modelo-datos.html`](modelo-datos.html) (interactivo).

**15 tablas en 4 áreas:**

| Área | Tablas |
|---|---|
| Vehículos | `Producto`, `Marca`, `Categoria`, `Imagen`, `auto_info_vendedor`, `auto_revision`, `HistorialPrecio` |
| Ubicación | `Ubicacion` |
| Usuarios | `Usuario`, `Empleado`, `CarritoItem` |
| Transacciones | `Transaccion`, `PlanFinanciacion`, `Pago`, `Logistica` |

### Decisiones de diseño

- **Cada vehículo es único.** No existe "stock": el estado del vehículo (`DISPONIBLE`, `RESERVADO`,
  `VENDIDO`, `PAUSADO`) cumple esa función.
- **Una transacción es un solo vehículo.** `Transaccion.ProductoId` apunta al vehículo comprado.
- **FK compuesta `(ProductoId, UsuarioVendedorId)` → `Producto`.** Garantiza que el vendedor guardado en la
  transacción sea de verdad el dueño del vehículo. Para eso `Producto` tiene `UNIQUE (ProductoId, UsuarioVendedorId)`.
- **El monto se copia en la transacción** (`Transaccion.Monto`). Si después cambia el precio publicado, la
  compra conserva el precio pactado (regla RN3).
- **Pagos y logística en tablas aparte.** Una compra puede tener varios intentos de pago y su propio estado de entrega.
- **Dinero en `DECIMAL(14,2)`**, nunca en `FLOAT`. **Fechas en `DATETIME2` UTC.**

### Integridad (restricciones principales)

| Restricción | Qué protege |
|---|---|
| `UQ_Producto_Patente`, `UX_Producto_Vin` (índice único filtrado) | No hay dos autos con la misma patente o VIN |
| `CK_Producto_Patente` | La patente es alfanumérica, de 5 a 8 caracteres |
| `CK_Producto_Precio`, `CK_Producto_Kilometraje`, `CK_Producto_Anio` | Precio > 0, km ≥ 0, año razonable |
| `CK_Producto_Estado`, `CK_Transaccion_Estado`, `CK_Pago_Estado`, … | Solo estados válidos |
| `UX_Transaccion_Producto_Activa` (índice único filtrado `WHERE Estado='PENDIENTE'`) | Un vehículo no puede tener dos compras pendientes al mismo tiempo |
| `CK_Transaccion_Participantes` | El comprador no es el vendedor ni el asesor |
| `CK_Transaccion_Confirmacion` | Toda compra `PAGADA` tiene fecha de confirmación |
| `UX_Imagen_Principal_PorProducto` | Una sola imagen principal por vehículo |
| `UQ_Usuario_Email`, `CK_Usuario_Email`, `UX_Usuario_Rut` | Correo único y con formato; RUT único si existe |

## 3. Objetos SQL

### Función

| Objeto | Qué hace | Dónde se usa |
|---|---|---|
| `fn_CuotaMensual(@Monto, @Cuotas, @Tasa)` | Calcula la cuota con el sistema francés: `monto · i / (1 − (1+i)^−n)`. Si la tasa es 0, la cuota es `monto / n`. | Cuota de referencia del catálogo, simulador del detalle y cuota de cada compra |

### Vistas ([`02_views.sql`](../database/02_views.sql))

| Vista | Por qué existe | La usa |
|---|---|---|
| `vw_CatalogoVehiculos` | Junta 6 tablas (marca, categoría, ubicación, vendedor, imagen principal, info del vendedor) y 3 subconsultas con `OUTER APPLY`: último cambio de precio (para "Bajó de precio"), revisión técnica más reciente y precio promedio de la categoría (para "Oportunidad"). Sin la vista, esa consulta se repetiría en el catálogo, el detalle, el carrito y "Mis publicaciones". | `sp_BuscarVehiculos`, `GET /vehiculos/:id`, `GET /carrito`, `GET /vendedor/vehiculos`, reportes |
| `vw_TransaccionesDetalle` | Una fila por compra con comprador, vendedor, asesor (`LEFT JOIN`), vehículo, plan y cuota, total pagado, intentos de pago, último estado de pago y estado de entrega. | Mis compras y ventas, detalle de compra, bandeja del asesor, respuesta de `sp_CrearTransaccion` |
| `vw_VentasPorMarca` | Agrupa por marca (`GROUP BY` + `SUM(CASE…)`): publicados, disponibles, reservados, vendidos, monto vendido y ticket promedio. Usa `LEFT JOIN` para incluir las marcas sin ventas. | Panel de reportes |

### Procedimientos almacenados ([`03_stored_procedures.sql`](../database/03_stored_procedures.sql))

| SP | Lógica de negocio | Transacción | Endpoint |
|---|---|---|---|
| `sp_BuscarVehiculos` | Búsqueda con 9 filtros opcionales usando `(@p IS NULL OR col = @p)`, sin SQL dinámico. Escapa los comodines de `LIKE`, ordena con `CASE`, pagina con `OFFSET/FETCH` y devuelve el total con `COUNT(*) OVER()`. Valida rangos y página. | — | `GET /api/vehiculos` |
| `sp_RegistrarUsuario` | Normaliza el correo y el RUT, valida formatos y unicidad, y no permite auto-asignarse ASESOR ni ADMIN. | — | `POST /api/auth/registro` |
| `sp_PublicarVehiculo` | Normaliza la patente (`ab-cd-12` → `ABCD12`), valida el formato chileno, año, km, precio, FK y duplicados. Inserta el vehículo, su imagen y la información del vendedor. | Sí (3 INSERT) | `POST /api/vendedor/vehiculos` |
| `sp_ActualizarPrecioVehiculo` | Solo el dueño o un ADMIN pueden cambiar el precio, y solo si el auto está disponible o pausado. Rechaza un precio igual al actual y las rebajas de más del 50 % (probable error de tipeo). Registra el cambio en `HistorialPrecio`. | Sí + `UPDLOCK` | `PATCH /api/vendedor/vehiculos/:id/precio` |
| `sp_CambiarEstadoVehiculo` | Pausa o reactiva una publicación. Al pausar, saca el auto de todos los carritos. | Sí | `PATCH /api/vendedor/vehiculos/:id/estado` |
| `sp_CrearTransaccion` | **Operación central.** Bloquea la fila del vehículo (`UPDLOCK`) para que dos compradores no lo reserven a la vez. Valida al comprador activo, que el auto no sea propio, que esté disponible, el plan vigente y la ciudad. Crea la transacción con el precio vigente, reserva el auto, lo saca de los carritos y crea la logística de entrega. | Sí (4 tablas) | `POST /api/transacciones` |
| `sp_RegistrarPago` | Registra el resultado de la pasarela. Si el pago es AUTORIZADO, la compra pasa a PAGADA, el auto a VENDIDO y la entrega a PROGRAMADA (+3 días). Si es RECHAZADO, la compra sigue pendiente; al 3.er rechazo pasa a RECHAZADA y el auto se libera. Genera una orden de compra única por intento. | Sí + `UPDLOCK` | `POST /api/transacciones/:id/pagos` |
| `sp_CancelarTransaccion` | Pueden cancelar el comprador, el vendedor, el asesor asignado o un ADMIN, y solo si la compra está PENDIENTE. Libera el auto y cancela la logística. | Sí | `POST /api/transacciones/:id/cancelar` |
| `sp_AsignarAsesor` | El usuario debe tener rol ASESOR y la compra debe estar pendiente. No se puede pisar a otro asesor ni asignarse a sí mismo como comprador. | — | `POST /api/transacciones/:id/asesor` |

Todos los SP que modifican varias tablas usan `SET XACT_ABORT ON` + `BEGIN TRY / BEGIN TRANSACTION` y, ante
cualquier error, `ROLLBACK` + `THROW`. El caso E3b de `05_pruebas.sql` comprueba que el rollback no deja nada a medias.

### Consultas explícitas en el backend (sin SP)

Las operaciones simples de una tabla o los reportes van como SQL visible en `backend/src/repositories/`:

| Consulta | Construcciones |
|---|---|
| Filtros del catálogo (`catalogoRepository.obtenerFiltros`) | 5 consultas en un lote: `LEFT JOIN` + `GROUP BY` (categorías con 0), `INNER JOIN` + `GROUP BY` + `HAVING`, `MIN/MAX/COUNT` |
| Detalle del vehículo (`obtenerDetalle`) | Vista + `LEFT JOIN`, `TOP`, `CROSS JOIN` con los planes y la función de cuota |
| Carrito (`carritoRepository`) | `INSERT … SELECT … WHERE … AND NOT EXISTS` (no agrega autos propios, no disponibles ni repetidos); `DELETE` siempre filtrado por usuario **y** producto |
| Mis publicaciones (`vendedorRepository.listarMisVehiculos`) | Vista + 3 subconsultas agregadas en `LEFT JOIN` (en carritos, cambios de precio, transacciones), `DATEDIFF`, `ORDER BY CASE` |
| Resumen del panel (`reporteRepository.resumen`) | 8 subconsultas escalares: conteos, `SUM`, `AVG(DATEDIFF)`, porcentaje con `NULLIF` |
| Demanda por categoría | Subconsultas agregadas + `GROUP BY` + `HAVING` |
| Publicaciones sin movimiento | Vista + `NOT EXISTS` + parámetro `@Dias` |
| Login (`usuarioRepository.buscarPorEmail`) | `SELECT` parametrizado. La contraseña se verifica en Node con scrypt, no en SQL |

## 4. API

Base: `http://localhost:3000/api`. Las respuestas son JSON y los errores tienen la forma `{ "error": "mensaje", "code": 54502 }`.

| Método | Ruta | Acceso | Objeto SQL |
|---|---|---|---|
| GET | `/health` | público | `SELECT DB_NAME()` |
| POST | `/auth/login` | público | consulta a `Usuario` |
| POST | `/auth/registro` | público | `sp_RegistrarUsuario` |
| GET | `/auth/perfil` | sesión | consulta a `Usuario` |
| GET | `/catalogo/filtros` | público | consultas con `GROUP BY` |
| GET | `/vehiculos?q&categoriaId&marcaId&precioMin&precioMax&anioMin&anioMax&transmision&orden&pagina` | público | `sp_BuscarVehiculos` |
| GET | `/vehiculos/:id` | público | `vw_CatalogoVehiculos` + `fn_CuotaMensual` |
| GET | `/planes` | público | consulta |
| GET / POST / DELETE | `/carrito`, `/carrito/:productoId` | sesión | SQL explícito |
| GET | `/transacciones` | sesión | `vw_TransaccionesDetalle` |
| POST | `/transacciones` | sesión | `sp_CrearTransaccion` |
| GET | `/transacciones/:id` | participante | `vw_TransaccionesDetalle` + `Pago` |
| POST | `/transacciones/:id/pagos` | comprador | `sp_RegistrarPago` |
| POST | `/transacciones/:id/cancelar` | participante | `sp_CancelarTransaccion` |
| GET | `/transacciones/pendientes` | ASESOR, ADMIN | `vw_TransaccionesDetalle` |
| POST | `/transacciones/:id/asesor` | ASESOR | `sp_AsignarAsesor` |
| GET / POST | `/vendedor/vehiculos` | VENDEDOR, ADMIN | consulta / `sp_PublicarVehiculo` |
| PATCH | `/vendedor/vehiculos/:id/precio` | VENDEDOR, ADMIN | `sp_ActualizarPrecioVehiculo` |
| PATCH | `/vendedor/vehiculos/:id/estado` | VENDEDOR, ADMIN | `sp_CambiarEstadoVehiculo` |
| GET | `/reportes/panel` | ASESOR, ADMIN | `vw_VentasPorMarca` + consultas |

**Pasarela de pago:** está simulada en `transaccionController.pagar`. En producción se llamaría a
Transbank Webpay y su respuesta se registraría con el mismo `sp_RegistrarPago`. La opción "Simular rechazo"
permite demostrar el camino de error.

## 5. Validación, errores y seguridad

**Tres barreras:**

1. **API:** tipos, rangos, largos máximos y listas cerradas (`backend/src/utils/validation.js`).
2. **Procedimientos almacenados:** reglas de negocio y de estado (`THROW 5xxxx`).
3. **Tablas:** `CHECK`, `FK`, `UNIQUE` e índices únicos filtrados, que protegen aunque alguien haga un `UPDATE` directo.

**Traducción de errores** (`errorHandler.js`):

| Error | HTTP |
|---|---|
| `THROW 51xxx` (dato inválido) | 400 |
| `THROW 52xxx` (sin permiso) | 403 |
| `THROW 53xxx` (no existe) | 404 |
| `THROW 54xxx` (conflicto de estado) | 409 |
| 2627 / 2601 (duplicado) | 409 |
| 547 (FK o CHECK) | 400 |
| Sin conexión a la base | 503 |
| Otro | 500 sin detalles internos (el detalle se registra en la consola) |

**Seguridad:**

- **Sin concatenación.** Todo valor del usuario va como parámetro tipado (`.input('Email', sql.NVarChar(120), email)`).
  Hay una prueba automática que envía `' OR 1=1; DROP TABLE dbo.Producto;--` como búsqueda.
- **Comodines de `LIKE` escapados** en `sp_BuscarVehiculos`: buscar `%` no devuelve todo.
- **Ningún `UPDATE` o `DELETE` sin filtro por clave.** Además se filtra por el estado esperado
  (`WHERE ProductoId = @id AND Estado = 'RESERVADO'`), así no se pisan cambios concurrentes.
- **Contraseñas con scrypt** y sal aleatoria; la comparación es en tiempo constante. El login da el mismo mensaje si el correo no existe o si la clave es incorrecta.
- **Sesión con token firmado con HMAC-SHA256** que expira a las 8 horas. Los permisos se revisan en dos lugares: en la ruta (rol) y en el SP (dueño o participante).
- **El frontend escapa todo dato** antes de insertarlo como HTML (función `h()`), para evitar XSS.

## 6. Pruebas

| Qué | Cómo correrlo | Resultado |
|---|---|---|
| Objetos SQL (`database/05_pruebas.sql`) | `pnpm db:pruebas` y luego `pnpm db:init` para restaurar | 27 casos: 8 normales, 6 límite, 13 de error. Muestra una tabla OK / FALLO |
| API de punta a punta (`backend/test/api.test.js`) | `pnpm test` (recrea la base antes y después) | 33 pruebas con `node:test` contra SQL Server real |

Casos destacados:

- **Normales:** búsqueda con filtros combinados; compra completa (reserva → pago rechazado → pago autorizado → vendido); cambio de precio con historial; publicar; panel.
- **Límite:** última página incompleta; `PrecioMin = PrecioMax`; rebaja de exactamente 50 % (se permite); tercer pago rechazado (libera el auto); página fuera de rango.
- **Errores:** comprar un auto propio, reservado o con un plan inactivo; pagar una compra ajena; patente duplicada escrita con otro formato (`rt-pk-45` = `RTPK45`); año futuro; un cliente que intenta publicar; rol incorrecto; rango invertido; `CHECK` y FK violados con SQL directo; dos compras pendientes del mismo auto (índice único filtrado); inyección SQL; JSON inválido; ruta sin token.

**Datos de prueba** ([`04_seed.sql`](../database/04_seed.sql)): 17 usuarios de los 4 roles (uno inactivo), 44 vehículos de 12 marcas en todos los estados (28 disponibles), 17 compras repartidas en 5 meses (10 pagadas, canceladas, una rechazada por 3 pagos fallidos y pendientes, una con más de 72 h), pagos rechazados y autorizados, entregas, historial de precios, revisiones y carritos.

## 7. Entrega final: trigger y cursor

Código listo y probado en [`database/06_entrega_final_trigger_cursor.sql`](../database/06_entrega_final_trigger_cursor.sql).
`pnpm db:init` no lo ejecuta todavía, porque corresponde a la entrega final.

### Trigger `trg_Producto_HistorialPrecio` (AFTER UPDATE en `Producto`)

- **Necesidad (RN6):** todo cambio de precio debe quedar registrado, venga de donde venga. Hoy lo registra
  `sp_ActualizarPrecioVehiculo`, pero un `UPDATE` directo (un administrador en SSMS, una carga masiva u otro SP
  futuro) se lo saltaría.
- **Por qué trigger:** es una regla transversal de auditoría, independiente de la interfaz. Es justo el caso que la rúbrica menciona.
- **Diseño:** orientado a conjuntos (`inserted` JOIN `deleted` `WHERE i.Precio <> d.Precio`), así que funciona con un `UPDATE` que cambie muchas filas. Al activarlo, el SP deja de insertar en el historial para no duplicar registros.
- **Ya probado:** un `UPDATE Producto SET Precio = Precio - 100000 WHERE CategoriaId = 2` dejó una fila de historial por cada auto afectado.

### Cursor `sp_VencerTransaccionesPendientes`

- **Necesidad:** una compra pendiente por más de 72 horas vence y el auto vuelve al catálogo. Se ejecutaría cada hora con SQL Server Agent o un endpoint de administración.
- **Por qué cursor:** cada vencimiento toca 3 tablas y debe ser atómico **por compra**. Si una falla (por ejemplo, alguien modificó el auto a mano), las demás deben vencer igual y el error queda registrado en `LogProcesoVencimiento`. Con un `UPDATE` masivo, un solo error revierte todo el lote.
- **Lo que reconocemos:** el cambio de estado por sí solo se puede resolver con SQL orientado a conjuntos. El cursor se justifica por el aislamiento de errores fila a fila y el registro individual. El volumen es bajo (decenas por hora), así que su costo no importa.
- **Ya probado:** venció la compra #6 (96 h), liberó el Nissan Navara y dejó el registro `OK`.

## 8. Estado del avance

**Implementado y conectado de punta a punta:** catálogo con filtros, orden y paginación; detalle con simulador de
cuotas; registro e inicio de sesión; carrito; compra con reserva; pago (simulado) con reintentos; cancelación;
publicación de vehículos; cambio de precio con historial; pausa y reactivación; bandeja del asesor; panel de
reportes.

**Pendiente para la entrega final:**

- activar el trigger y el cursor (incluido un endpoint o job para el vencimiento);
- carga de varias imágenes por vehículo;
- gestión de logística por empleados (asignar conductor, marcar entrega);
- registro de revisiones técnicas desde la interfaz;
- integración real con Transbank.
