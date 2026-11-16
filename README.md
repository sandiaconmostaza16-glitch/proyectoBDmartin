# Ruta: marketplace de autos usados

Proyecto del **Taller de Bases de Datos, avance 60 %**. Ruta es una aplicación web para comprar y vender autos
usados. Tiene un **frontend** que solo muestra la interfaz, una **API** que concentra la lógica y la validación, y
una base de datos **Microsoft SQL Server**. Todo el acceso a datos usa **SQL explícito y parametrizado, sin ORM**.

La documentación técnica completa (modelo, objetos SQL, endpoints, seguridad, pruebas y la propuesta de
trigger y cursor) está en [`docs/documentacion.md`](docs/documentacion.md).

---

## Contenido

1. [Funcionalidades](#1-funcionalidades)
2. [Tecnologías y arquitectura](#2-tecnologías-y-arquitectura)
3. [Base de datos](#3-base-de-datos)
4. [Cumplimiento de los requisitos del avance](#4-cumplimiento-de-los-requisitos-del-avance)
5. [Instalación paso a paso](#5-instalación-paso-a-paso)
6. [Cuentas de prueba](#6-cuentas-de-prueba)
7. [Pruebas](#7-pruebas)
8. [Estructura del proyecto](#8-estructura-del-proyecto)

---

## 1. Funcionalidades

| Rol | Qué puede hacer |
|---|---|
| Cualquier visitante | Ver el catálogo con búsqueda, filtros (tipo, marca, precio, año, transmisión), orden y paginación. Ver el detalle de un auto con fotos, revisión técnica, historial de precios y simulador de cuotas. |
| Cliente | Registrarse e iniciar sesión, usar un carrito guardado en la base, comprar un auto (queda reservado), pagarlo al contado o en cuotas, reintentar un pago rechazado y cancelar la compra. |
| Vendedor | Publicar autos, cambiar el precio (queda registrado en el historial) y pausar o reactivar publicaciones. Ve cuántas personas tienen cada auto en su carrito. |
| Asesor | Ver la bandeja de compras pendientes (las que pasan de 72 h aparecen marcadas) y tomar una para acompañarla. |
| Administrador | Ver el panel de reportes: indicadores, ventas por marca, demanda por categoría y publicaciones sin movimiento. |

## 2. Tecnologías y arquitectura

```
Frontend (Vite + JavaScript)  ──HTTP/JSON──▶  API (Node.js + Express)  ──SQL parametrizado──▶  SQL Server
     solo interfaz                            valida, aplica permisos,                       tablas, vistas,
                                              ejecuta consultas y SP                         función, procedimientos
```

- **El frontend nunca se conecta a la base.** Toda lectura o escritura pasa por la API.
- **Sin ORM.** La API usa el driver `mssql` solo para abrir la conexión y enviar parámetros. Todo el SQL está escrito a mano en `backend/src/repositories/`.
- **Los errores de la base se traducen a códigos HTTP:** 400 dato inválido, 403 sin permiso, 404 no existe y 409 conflicto de estado.

## 3. Base de datos

| Objeto | Cantidad | Detalle |
|---|---|---|
| Tablas | 15 | En 4 áreas: vehículos, compras, usuarios y ubicación. Con PK, FK (incluida una compuesta), CHECK, UNIQUE e índices únicos filtrados |
| Vistas | 3 | `vw_CatalogoVehiculos`, `vw_TransaccionesDetalle`, `vw_VentasPorMarca` |
| Función | 1 | `fn_CuotaMensual` (cuota con el sistema francés) |
| Procedimientos | 9 | Búsqueda, registro, publicar, cambiar precio, cambiar estado, crear compra, registrar pago, cancelar y asignar asesor |
| Trigger y cursor | 2 | Escritos y probados para la entrega final en `database/06_entrega_final_trigger_cursor.sql` |

Los scripts se ejecutan en orden: `00_create_database` → `01_schema` → `02_views` → `03_stored_procedures` → `04_seed`.
Los datos de prueba incluyen 17 usuarios, 44 autos (28 disponibles), 17 compras de los últimos 5 meses, pagos,
entregas, historial de precios, revisiones y carritos.

Diagrama entidad-relación: [`docs/modelo-relacional-objetivo.md`](docs/modelo-relacional-objetivo.md)
(Mermaid) y [`docs/modelo-datos.html`](docs/modelo-datos.html) (interactivo, se abre en el navegador).

## 4. Cumplimiento de los requisitos del avance

| Requisito | Dónde se ve |
|---|---|
| Arquitectura full stack con API | `frontend/` consume `backend/` por HTTP; solo el backend tiene las credenciales de SQL Server |
| SQL explícito, sin ORM | `backend/src/repositories/*.js` |
| Consultas parametrizadas | Todas usan `.input(nombre, tipo, valor)`; hay una prueba de inyección SQL |
| Consultas con JOIN, agrupaciones, subconsultas y funciones | Vistas y repositorios (`GROUP BY`/`HAVING`, `OUTER APPLY`, `NOT EXISTS`, subconsultas escalares, `COUNT(*) OVER()`) |
| Vistas usadas por la aplicación | Catálogo, detalle, carrito, mis compras, panel |
| Procedimientos con parámetros y validación | `database/03_stored_procedures.sql`; los que tocan varias tablas usan transacciones |
| UPDATE y DELETE sin cambios masivos | Siempre filtran por clave **y** por el estado esperado |
| Pruebas: casos normales, límite y error | `database/05_pruebas.sql` (27 casos) y `backend/test/api.test.js` (33 pruebas) |
| Propuesta de trigger y cursor | `docs/documentacion.md`, sección 7, y el script `06` |

---

## 5. Instalación paso a paso

Probado en **Windows 10/11**. Hay que instalar tres programas una sola vez: Node.js, SQL Server Express y
DBeaver (opcional, para ver la base). Toma unos 20 minutos.

### 5.1 Instalar Node.js y pnpm

1. Descarga e instala **Node.js LTS** (versión 20 o superior) desde <https://nodejs.org>. Usa las opciones por defecto.
2. Abre una terminal nueva (PowerShell) e instala pnpm:
   ```powershell
   npm install -g pnpm
   ```
3. Comprueba que ambos funcionan: `node -v` y `pnpm -v` deben mostrar un número de versión.

### 5.2 Instalar SQL Server Express

1. Descarga **SQL Server 2022 Express** desde la página oficial de Microsoft (busca "SQL Server 2022 Express download").
2. Abre el instalador y elige **Personalizada** (Custom). La instalación "Básica" no permite usuario y contraseña.
3. En el centro de instalación elige **Nueva instalación independiente de SQL Server** y avanza con *Siguiente*.
4. En **Configuración del motor de base de datos** (Database Engine Configuration):
   - marca **Modo mixto** (Mixed Mode),
   - escribe la contraseña del usuario `sa`: **`Ruta_Dev_2026!`** (la misma del archivo de configuración del proyecto; si usas otra, tendrás que cambiarla en el paso 5.4),
   - pulsa **Agregar usuario actual**.
5. Termina la instalación. Queda una instancia llamada `SQLEXPRESS`.

> **¿Ya tenías SQL Server Express instalado con la opción "Básica"?** Abre PowerShell y ejecuta lo siguiente para
> activar el usuario `sa`. Después reinicia el servicio como se explica en el paso 5.3.
> ```powershell
> sqlcmd -S localhost\SQLEXPRESS -E -Q "ALTER LOGIN sa ENABLE; ALTER LOGIN sa WITH PASSWORD = 'Ruta_Dev_2026!'; EXEC xp_instance_regwrite N'HKEY_LOCAL_MACHINE', N'Software\Microsoft\MSSQLServer\MSSQLServer', N'LoginMode', REG_DWORD, 2;"
> ```

### 5.3 Habilitar la conexión por red (TCP, puerto 1433)

SQL Server Express viene con la conexión TCP desactivada, y la aplicación la necesita.

1. Presiona `Windows + R`, escribe **`SQLServerManager16.msc`** y presiona Enter. Se abre *SQL Server Configuration Manager*.
2. Ve a **Configuración de red de SQL Server → Protocolos de SQLEXPRESS**.
3. Clic derecho en **TCP/IP → Habilitar**.
4. Clic derecho en **TCP/IP → Propiedades → pestaña Direcciones IP**. Baja hasta la sección **IPAll** y deja:
   - *Puertos dinámicos de TCP*: **vacío** (borra el 0 si aparece),
   - *Puerto TCP*: **1433**.
5. Pulsa *Aceptar*. Luego, en **Servicios de SQL Server**, haz clic derecho en **SQL Server (SQLEXPRESS) → Reiniciar**.

### 5.4 Descargar el proyecto y configurarlo

1. Descomprime el proyecto (o clónalo con git) y abre una terminal **en la carpeta del proyecto**.
2. Instala las dependencias:
   ```powershell
   pnpm install
   pnpm --dir backend install
   ```
3. Crea el archivo de configuración a partir del ejemplo:
   ```powershell
   copy backend\.env.example backend\.env
   ```
   El ejemplo ya trae `localhost`, puerto `1433`, usuario `sa` y la contraseña `Ruta_Dev_2026!`. Si usaste otra
   contraseña en el paso 5.2, ábrelo con el Bloc de notas y cambia `DB_PASSWORD`.

### 5.5 Crear la base de datos

Opción A (recomendada): un solo comando ejecuta los cinco scripts en orden.

```powershell
pnpm db:init
```

Debe terminar con `Base de datos RutaDB lista.` Este comando también sirve para dejar la base como nueva cuando se necesite.

Opción B: con DBeaver (ver el paso 5.7). Conectado a la base `master`, abre cada archivo de la carpeta `database/`
en orden (`00`, `01`, `02`, `03`, `04`) y ejecútalo con **Ejecutar script (Alt+X)**. No uses Ctrl+Enter, que
ejecuta una sola sentencia.

### 5.6 Levantar la aplicación

Hacen falta **dos terminales** abiertas en la carpeta del proyecto:

```powershell
# Terminal 1: la API
pnpm dev:backend
```

```powershell
# Terminal 2: el frontend
pnpm dev
```

Abre <http://localhost:5173> en el navegador. Para comprobar que la API está conectada a la base, abre
<http://localhost:3000/api/health>: debe responder `"status":"ok"` y `"baseDatos":"RutaDB"`.

### 5.7 (Opcional) Ver la base con DBeaver

1. Instala **DBeaver Community** desde <https://dbeaver.io>.
2. *Base de datos → Nueva conexión* → elige **SQL Server** → *Siguiente*.
3. Completa: Host `localhost`, Puerto `1433`, Base de datos `master` (o `RutaDB` cuando ya exista),
   Autenticación **SQL Server Authentication**, Usuario `sa`, Contraseña `Ruta_Dev_2026!`.
4. Si DBeaver pide descargar el driver, acepta.
5. Si aparece un error de certificado, ve a la pestaña **Propiedades del driver** y pon `trustServerCertificate` en `true`.
6. *Probar conexión* → *Finalizar*. La base `RutaDB` aparece con sus tablas, vistas y procedimientos.

### 5.8 Problemas comunes

| Problema | Solución |
|---|---|
| `pnpm` no se reconoce | Cierra y vuelve a abrir la terminal después de instalarlo (paso 5.1). |
| `Login failed for user 'sa'` | El modo mixto no está activo o la contraseña no coincide con `backend/.env` (paso 5.2). Reinicia el servicio después de cambiarlo. |
| `Failed to connect to localhost:1433` | Falta habilitar TCP/IP con el puerto 1433 o reiniciar el servicio (paso 5.3). |
| `pnpm db:init` dice que la base está en uso | Detén la API (Ctrl+C) y cierra la conexión de DBeaver a `RutaDB`; luego repite. |
| El sitio dice "No se pudo conectar con el servidor" | La API no está corriendo: revisa la terminal 1 (paso 5.6). |
| El puerto 3000 o 5173 está ocupado | Cierra otras aplicaciones que lo usen, o cambia `PORT` en `backend/.env`. |

> **Alternativas:** si prefieres no tocar el puerto, deja TCP/IP habilitado con puertos dinámicos, inicia el servicio
> **SQL Server Browser** y agrega `DB_INSTANCE=SQLEXPRESS` en `backend/.env`. Con Docker, `docker compose up -d`
> levanta SQL Server en el puerto 1433 y se continúa desde el paso 5.4.

---

## 6. Cuentas de prueba

Todas usan la contraseña **`ruta123`**. Se guarda en la base como hash scrypt, nunca en texto plano.

| Correo | Rol | Para probar |
|---|---|---|
| `demo@ruta.cl` | Cliente | Carrito, compra y pago |
| `vendedor@ruta.cl` | Vendedor | Publicar, cambiar precio y pausar |
| `asesor@ruta.cl` | Asesor | Bandeja de compras pendientes |
| `admin@ruta.cl` | Administrador | Panel de reportes |
| `tomas@ruta.cl` | Cliente inactivo | El inicio de sesión debe rechazarlo |

Hay más cuentas en `database/04_seed.sql`, por ejemplo `felipe@ruta.cl` (vendedor) y `diego@ruta.cl` (asesor).

## 7. Pruebas

```powershell
pnpm test          # 33 pruebas de la API contra SQL Server (recrea la base antes y después)
pnpm db:pruebas    # 27 casos SQL normales, límite y de error; luego ejecuta pnpm db:init
```

`pnpm db:pruebas` muestra al final una tabla con cada caso y si pasó (`OK = 1`).

## 8. Estructura del proyecto

```
database/
  00_create_database.sql              crea RutaDB
  01_schema.sql                       15 tablas con sus restricciones e índices
  02_views.sql                        función y 3 vistas
  03_stored_procedures.sql            9 procedimientos almacenados
  04_seed.sql                         datos de prueba
  05_pruebas.sql                      casos de prueba de los objetos SQL
  06_entrega_final_trigger_cursor.sql trigger y cursor (entrega final)
backend/
  src/routes/          endpoints y permisos por rol
  src/controllers/     validación de entrada y respuesta
  src/repositories/    todo el SQL de la aplicación
  src/middleware/      sesión y traducción de errores SQL → HTTP
  scripts/             init-db.js (crea la base) y run-sql.js (ejecuta un script)
  test/                pruebas de integración
frontend/
  app.js, api.js, styles.css           interfaz que consume la API
docs/
  documentacion.md                    documentación técnica
  modelo-datos.html                   diagrama ER interactivo
  modelo-relacional-objetivo.md       diagrama ER en Mermaid
```
