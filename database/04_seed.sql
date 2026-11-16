/*
    04_seed.sql
    Datos de prueba. Ejecutar sobre una base recien creada (00 -> 03): los
    INSERT asumen que los IDENTITY parten en 1.

    Todas las cuentas usan la contrasena: ruta123
    (se guarda como hash scrypt, nunca en texto plano)

    | Correo            | Rol      | Para que sirve en la demo                 |
    |-------------------|----------|-------------------------------------------|
    | admin@ruta.cl     | ADMIN    | Panel de reportes                         |
    | asesor@ruta.cl    | ASESOR   | Tomar transacciones pendientes            |
    | vendedor@ruta.cl  | VENDEDOR | Publicar autos, cambiar precio, pausar    |
    | paula@ruta.cl     | VENDEDOR | Segunda vendedora                         |
    | demo@ruta.cl      | CLIENTE  | Comprar: carrito, transaccion y pago      |
    | javiera@ruta.cl   | CLIENTE  | Tiene una compra pendiente                |
    | tomas@ruta.cl     | CLIENTE  | Cuenta INACTIVA: el login debe rechazarla |
    | felipe@, camila@  | VENDEDOR | Vendedores del segundo bloque             |
    | diego@ruta.cl     | ASESOR   | Segundo asesor                            |

    Total: 17 usuarios, 44 vehiculos (28 disponibles), 17 transacciones.
*/
USE RutaDB;
GO

SET NOCOUNT ON;

DECLARE @Hash NVARCHAR(255) =
    N'scrypt$cce1274cf9e1ffe4c7881e15f0b9937b$7e0f5e74b07d0e1775367cf4f143eed72d93882f7f5f0e087a1da774b38793c6';

INSERT INTO dbo.Usuario (Nombre, Apellido, Rut, Email, PasswordHash, Telefono, Direccion, Rol, Estado)
VALUES
 (N'Admin',   N'Ruta',    N'11111111-1', N'admin@ruta.cl',    @Hash, N'+56911111111', NULL,                          'ADMIN',    1), -- 1
 (N'Carla',   N'Soto',    N'12345678-5', N'asesor@ruta.cl',   @Hash, N'+56922222222', NULL,                          'ASESOR',   1), -- 2
 (N'Martín',  N'Rojas',   N'15678901-2', N'vendedor@ruta.cl', @Hash, N'+56933333333', N'Av. Providencia 1234',       'VENDEDOR', 1), -- 3
 (N'Paula',   N'Díaz',    N'16789012-3', N'paula@ruta.cl',    @Hash, N'+56944444444', N'Av. Libertad 456, Viña del Mar',     'VENDEDOR', 1), -- 4
 (N'Alex',    N'Morales', N'18901234-5', N'demo@ruta.cl',     @Hash, N'+56955555555', N'Los Leones 789, Providencia','CLIENTE',  1), -- 5
 (N'Javiera', N'Pérez',   N'19012345-6', N'javiera@ruta.cl',  @Hash, N'+56966666666', N'Barros Arana 321, Concepción','CLIENTE', 1), -- 6
 (N'Tomás',   N'Vera',    N'20123456-7', N'tomas@ruta.cl',    @Hash, NULL,            NULL,                          'CLIENTE',  0); -- 7

INSERT INTO dbo.Ubicacion (Provincia, Ciudad)
VALUES
 (N'Santiago',    N'Providencia'),   -- 1
 (N'Santiago',    N'Las Condes'),    -- 2
 (N'Santiago',    N'Maipú'),         -- 3
 (N'Valparaíso',  N'Viña del Mar'),  -- 4
 (N'Concepción',  N'Concepción'),    -- 5
 (N'Antofagasta', N'Antofagasta'),   -- 6
 (N'Cautín',      N'Temuco'),        -- 7
 (N'Llanquihue',  N'Puerto Montt');  -- 8

INSERT INTO dbo.Marca (Nombre)
VALUES (N'Toyota'), (N'Volkswagen'), (N'Ford'), (N'Honda'), (N'Jeep'), (N'Hyundai'),
       (N'Kia'), (N'Chevrolet'), (N'Nissan'), (N'Mazda'), (N'Subaru'), (N'BYD');
--      1            2               3          4           5          6
--      7            8               9          10          11         12

INSERT INTO dbo.Categoria (Nombre)
VALUES (N'SUV'), (N'Sedán'), (N'Pick-up'), (N'Hatchback'), (N'Eléctrico');
--      1          2            3              4               5

INSERT INTO dbo.PlanFinanciacion (Nombre, CantidadCuotas, TasaMensual, Activo)
VALUES
 (N'Crédito 12 cuotas', 12, 0.0110, 1),  -- 1
 (N'Crédito 24 cuotas', 24, 0.0125, 1),  -- 2
 (N'Crédito 36 cuotas', 36, 0.0135, 1),  -- 3
 (N'Crédito 48 cuotas', 48, 0.0145, 1),  -- 4
 (N'Promo 0% 2024',     12, 0.0000, 0);  -- 5 (inactivo: no se puede usar)

DECLARE @Ahora DATETIME2(0) = SYSUTCDATETIME();

INSERT INTO dbo.Producto
 (UsuarioVendedorId, MarcaId, CategoriaId, UbicacionId, Modelo, Version, Combustible, Anio,
  Patente, Color, Kilometraje, Transmision, Precio, Descripcion, Estado, FechaPublicacion)
VALUES
 (3, 1, 1, 1, N'Corolla Cross', N'XEI 1.8 Híbrido',     N'Híbrido',   2023, N'RTPK45', N'Gris',    18500, 'CVT',        24990000, N'Unico dueno, mantenciones en concesionario. Consumo real de 20 km/l.', 'DISPONIBLE', DATEADD(DAY, -2,  @Ahora)), -- 1
 (3, 2, 1, 2, N'Taos',          N'Comfortline 1.4 TSI', N'Bencina',   2022, N'PLGH12', N'Blanco',  26000, 'AUTOMATICA', 22490000, N'Techo panoramico, camara de retroceso y Apple CarPlay.',               'DISPONIBLE', DATEADD(DAY, -5,  @Ahora)), -- 2
 (4, 3, 3, 5, N'Ranger',        N'XLT 3.2 4x4',         N'Diésel',    2021, N'LKJT89', N'Azul',    42000, 'AUTOMATICA', 27990000, N'Pick-up lista para trabajo o aventura. Pisadera y cubre pick-up.',     'DISPONIBLE', DATEADD(DAY, -9,  @Ahora)), -- 3
 (3, 4, 2, 1, N'Civic',         N'Touring 1.5T',        N'Bencina',   2022, N'RSZW23', N'Negro',   22300, 'CVT',        21990000, N'Version full con tapiz de cuero y sonroof.',                            'DISPONIBLE', DATEADD(DAY, -3,  @Ahora)), -- 4
 (4, 5, 1, 4, N'Renegade',      N'Longitude 1.8',       N'Bencina',   2023, N'SBCD34', N'Rojo',    12800, 'AUTOMATICA', 18990000, N'Como nuevo, aun con garantia de fabrica.',                              'DISPONIBLE', DATEADD(DAY, -1,  @Ahora)), -- 5
 (4, 6, 1, 6, N'Tucson',        N'GL 2.0',              N'Bencina',   2021, N'KZPR56', N'Plata',   48000, 'AUTOMATICA', 16490000, N'Precio conversable. Neumaticos nuevos.',                                'DISPONIBLE', DATEADD(DAY, -12, @Ahora)), -- 6
 (3, 7, 4, 3, N'Rio 5',         N'EX 1.4',              N'Bencina',   2020, N'JHGF78', N'Blanco',  61000, 'MANUAL',      8990000, N'Ideal primer auto, muy economico.',                                     'DISPONIBLE', DATEADD(DAY, -20, @Ahora)), -- 7
 (4, 8, 3, 7, N'Silverado',     N'LTZ 5.3 V8',          N'Bencina',   2022, N'PXLT90', N'Negro',   35000, 'AUTOMATICA', 34990000, N'Full equipo, gancho de arrastre.',                                      'DISPONIBLE', DATEADD(DAY, -6,  @Ahora)), -- 8
 (3, 9, 2, 2, N'Sentra',        N'Advance 2.0',         N'Bencina',   2021, N'LRTW11', N'Gris',    39000, 'CVT',        13490000, N'Mantenciones al dia, dos llaves.',                                      'DISPONIBLE', DATEADD(DAY, -15, @Ahora)), -- 9
 (4,10, 1, 4, N'CX-5',          N'R 2.5 AWD',           N'Bencina',   2022, N'RKTS22', N'Rojo',    27000, 'AUTOMATICA', 23990000, N'Traccion integral, asientos calefaccionados.',                          'DISPONIBLE', DATEADD(DAY, -4,  @Ahora)), -- 10
 (3,11, 1, 8, N'Forester',      N'2.0i AWD',            N'Bencina',   2020, N'HYTR33', N'Verde',   72000, 'CVT',        15990000, N'Perfecto para el sur. Revision tecnica por renovar.',                   'DISPONIBLE', DATEADD(DAY, -25, @Ahora)), -- 11
 (4,12, 5, 1, N'Dolphin',       N'GS 44,9 kWh',         N'Eléctrico', 2024, N'TBYD44', N'Celeste',  5200, 'AUTOMATICA', 19990000, N'100% electrico, 340 km de autonomia. Cargador incluido.',               'DISPONIBLE', DATEADD(DAY, -2,  @Ahora)), -- 12
 (3, 1, 3, 6, N'Hilux',         N'SRV 2.8 4x4',         N'Diésel',    2020, N'KLPM55', N'Blanco',  88000, 'MANUAL',     22990000, N'Detalle menor en puerta trasera, mecanica impecable.',                  'DISPONIBLE', DATEADD(DAY, -30, @Ahora)), -- 13
 (4, 6, 4, 5, N'Accent',        N'GL 1.4',              N'Bencina',   2019, N'JKRT66', N'Azul',    79000, 'MANUAL',      7490000, N'Publicacion pausada por el vendedor.',                                  'PAUSADO',    DATEADD(DAY, -40, @Ahora)), -- 14
 (3, 2, 4, 1, N'Golf',          N'GTI 2.0 TSI',         N'Bencina',   2021, N'LPWS77', N'Blanco',  31000, 'AUTOMATICA', 25990000, N'Vendido.',                                                              'VENDIDO',    DATEADD(DAY, -35, @Ahora)), -- 15
 (4, 7, 1, 2, N'Sportage',      N'EX 2.0',              N'Bencina',   2022, N'RPLK88', N'Gris',    29000, 'AUTOMATICA', 21490000, N'Vendido.',                                                              'VENDIDO',    DATEADD(DAY, -28, @Ahora)), -- 16
 (3, 4, 1, 4, N'CR-V',          N'EXL 1.5T AWD',        N'Bencina',   2021, N'LZXC99', N'Negro',   41000, 'CVT',        22990000, N'Reservado.',                                                            'RESERVADO',  DATEADD(DAY, -10, @Ahora)), -- 17
 (4, 1, 2, 3, N'Yaris',         N'Sport 1.5',           N'Bencina',   2022, N'RVBN10', N'Rojo',    19000, 'CVT',        12990000, N'Vendido.',                                                              'VENDIDO',    DATEADD(DAY, -50, @Ahora)), -- 18
 (3, 5, 1, 7, N'Compass',       N'Limited 1.3T',        N'Bencina',   2022, N'RQWE21', N'Gris',    33000, 'AUTOMATICA', 24490000, N'Volvio a estar disponible tras una compra cancelada.',                  'DISPONIBLE', DATEADD(DAY, -8,  @Ahora)), -- 19
 (4, 9, 3, 5, N'Navara',        N'LE 2.3 4x4',          N'Diésel',    2021, N'KXNV32', N'Plata',   56000, 'AUTOMATICA', 23490000, N'Reservado hace mas de 72 horas sin pago.',                              'RESERVADO',  DATEADD(DAY, -15, @Ahora)); -- 20

-- Imagenes (una principal por vehiculo y algunas secundarias)
DECLARE @U NVARCHAR(100) = N'https://images.unsplash.com/';
DECLARE @Q NVARCHAR(100) = N'?auto=format&fit=crop&w=900&q=80';

INSERT INTO dbo.Imagen (ProductoId, UrlImagen, EsPrincipal, Orden)
VALUES
 ( 1, @U + N'photo-1519641471654-76ce0107ad1b' + @Q, 1, 0),
 ( 1, @U + N'photo-1492144534655-ae79c964c9d7' + @Q, 0, 1),
 ( 2, @U + N'photo-1511919884226-fd3cad34687c' + @Q, 1, 0),
 ( 3, @U + N'photo-1551830820-330a71b99659'    + @Q, 1, 0),
 ( 4, @U + N'photo-1552519507-da3b142c6e3d'    + @Q, 1, 0),
 ( 4, @U + N'photo-1503376780353-7e6692767b70' + @Q, 0, 1),
 ( 5, @U + N'photo-1533473359331-0135ef1b58bf' + @Q, 1, 0),
 ( 6, @U + N'photo-1549317661-bd32c8ce0db2'    + @Q, 1, 0),
 ( 7, @U + N'photo-1542362567-b07e54358753'    + @Q, 1, 0),
 ( 8, @U + N'photo-1551830820-330a71b99659'    + @Q, 1, 0),
 ( 9, @U + N'photo-1503376780353-7e6692767b70' + @Q, 1, 0),
 (10, @U + N'photo-1492144534655-ae79c964c9d7' + @Q, 1, 0),
 (11, @U + N'photo-1511919884226-fd3cad34687c' + @Q, 1, 0),
 (12, @U + N'photo-1542362567-b07e54358753'    + @Q, 1, 0),
 (13, @U + N'photo-1519641471654-76ce0107ad1b' + @Q, 1, 0),
 (14, @U + N'photo-1549317661-bd32c8ce0db2'    + @Q, 1, 0),
 (15, @U + N'photo-1552519507-da3b142c6e3d'    + @Q, 1, 0),
 (16, @U + N'photo-1533473359331-0135ef1b58bf' + @Q, 1, 0),
 (17, @U + N'photo-1492144534655-ae79c964c9d7' + @Q, 1, 0),
 (18, @U + N'photo-1503376780353-7e6692767b70' + @Q, 1, 0),
 (19, @U + N'photo-1549317661-bd32c8ce0db2'    + @Q, 1, 0),
 (20, @U + N'photo-1551830820-330a71b99659'    + @Q, 1, 0);

INSERT INTO dbo.auto_info_vendedor (ProductoId, MotivoVenta, DuenosAnteriores, Mantenciones)
VALUES
 ( 1, N'Cambio a un auto mas grande',   1, N'10.000 y 20.000 km en concesionario'),
 ( 2, N'Viaje al extranjero',           1, N'Mantenciones al dia'),
 ( 3, N'Renovacion de flota',           2, N'Cambio de correa a los 40.000 km'),
 ( 4, N'Compra de auto electrico',      1, N'Mantenciones en concesionario'),
 ( 5, N'Necesito un auto 7 asientos',   1, N'Primera mantencion realizada'),
 ( 6, N'Venta rapida',                  2, NULL),
 ( 7, N'Me cambio de ciudad',           3, N'Embrague nuevo'),
 ( 8, NULL,                             1, NULL),
 ( 9, N'Herencia',                      2, N'Mantenciones al dia'),
 (10, N'Cambio de auto',                1, N'Mantenciones en concesionario'),
 (11, NULL,                             3, NULL),
 (12, N'Cambio por modelo mayor',       0, N'Sin mantenciones aun'),
 (13, N'Renovacion',                    2, N'Mantencion mayor a los 80.000 km'),
 (19, N'Cambio de auto',                1, NULL),
 (20, N'Compro una camioneta mas nueva',1, NULL);

INSERT INTO dbo.auto_revision (ProductoId, TieneChoques, DetalleDanos, PapelesAlDia, RevisionTecnicaOk, Observaciones, FechaRevision)
VALUES
 ( 1, 0, NULL,                               1, 1, N'Sin observaciones',                    DATEADD(DAY, -3,  @Ahora)),
 ( 2, 0, NULL,                               1, 1, N'Pastillas de freno al 60%',            DATEADD(DAY, -6,  @Ahora)),
 ( 3, 0, NULL,                               1, 1, NULL,                                    DATEADD(DAY, -10, @Ahora)),
 ( 4, 0, NULL,                               1, 1, NULL,                                    DATEADD(DAY, -4,  @Ahora)),
 ( 5, 0, NULL,                               1, 1, NULL,                                    DATEADD(DAY, -2,  @Ahora)),
 ( 8, 0, NULL,                               1, 1, NULL,                                    DATEADD(DAY, -7,  @Ahora)),
 (10, 0, NULL,                               1, 1, NULL,                                    DATEADD(DAY, -5,  @Ahora)),
 (11, 0, NULL,                               1, 0, N'Revision tecnica vencida',             DATEADD(DAY, -26, @Ahora)),
 (12, 0, NULL,                               1, 1, N'Bateria al 98%',                       DATEADD(DAY, -3,  @Ahora)),
 (13, 1, N'Rayon y abolladura puerta trasera', 1, 1, N'Dano estetico, sin dano estructural', DATEADD(DAY, -31, @Ahora)),
 (17, 0, NULL,                               1, 1, NULL,                                    DATEADD(DAY, -11, @Ahora)),
 (19, 0, NULL,                               1, 1, NULL,                                    DATEADD(DAY, -9,  @Ahora));

-- Cambios de precio historicos (3, 6 y 13 bajaron; 2 subio)
INSERT INTO dbo.HistorialPrecio (ProductoId, PrecioAnterior, PrecioNuevo, FechaCambio)
VALUES
 ( 3, 29990000, 27990000, DATEADD(DAY, -3,  @Ahora)),
 ( 6, 17490000, 16490000, DATEADD(DAY, -5,  @Ahora)),
 (13, 25990000, 24490000, DATEADD(DAY, -20, @Ahora)),
 (13, 24490000, 22990000, DATEADD(DAY, -6,  @Ahora)),
 ( 2, 21990000, 22490000, DATEADD(DAY, -1,  @Ahora));

INSERT INTO dbo.Empleado (UsuarioId, Nombre, Rut, Email, Fono, Cargo, FechaIngreso)
VALUES
 (NULL, N'Ricardo Muñoz', N'13456789-0', N'ricardo.munoz@ruta.cl', N'+56977777777', N'Conductor de traslados', '2024-03-01'), -- 1
 (2,    N'Carla Soto',    N'12345678-5', N'carla.soto@ruta.cl',    N'+56922222222', N'Asesora comercial',      '2023-08-15'); -- 2

-- Transacciones: 3 pagadas, 1 cancelada, 2 pendientes (una con mas de 72 h)
INSERT INTO dbo.Transaccion
 (UsuarioCompradorId, UsuarioVendedorId, AsesorUsuarioId, ProductoId, PlanId, Fecha, FechaConfirmacion, Monto, Estado)
VALUES
 (5, 3, 2,    15, 2,    DATEADD(DAY, -20, @Ahora), DATEADD(DAY, -20, @Ahora), 25990000, 'PAGADA'),    -- 1
 (6, 4, 2,    16, NULL, DATEADD(DAY, -14, @Ahora), DATEADD(DAY, -14, @Ahora), 21490000, 'PAGADA'),    -- 2
 (5, 4, NULL, 18, 4,    DATEADD(DAY, -45, @Ahora), DATEADD(DAY, -44, @Ahora), 12990000, 'PAGADA'),    -- 3
 (5, 3, NULL, 19, NULL, DATEADD(DAY, -7,  @Ahora), NULL,                      24490000, 'CANCELADA'), -- 4
 (6, 3, NULL, 17, 3,    DATEADD(HOUR, -26, @Ahora), NULL,                     22990000, 'PENDIENTE'), -- 5
 (5, 4, NULL, 20, NULL, DATEADD(HOUR, -96, @Ahora), NULL,                     23490000, 'PENDIENTE'); -- 6 (vencible)

INSERT INTO dbo.Pago
 (TransaccionId, OrdenCompra, Monto, CodigoAutorizacion, TipoPago, EstadoPago, FechaCreacion, FechaActualizacion)
VALUES
 (1, N'OC-1-1', 25990000, NULL,     'CREDITO', 'RECHAZADO',  DATEADD(DAY, -20, @Ahora), DATEADD(DAY, -20, @Ahora)),
 (1, N'OC-1-2', 25990000, N'483920', 'CREDITO', 'AUTORIZADO', DATEADD(DAY, -20, @Ahora), DATEADD(DAY, -20, @Ahora)),
 (2, N'OC-2-1', 21490000, N'771023', 'DEBITO',  'AUTORIZADO', DATEADD(DAY, -14, @Ahora), DATEADD(DAY, -14, @Ahora)),
 (3, N'OC-3-1', 12990000, N'120934', 'CREDITO', 'AUTORIZADO', DATEADD(DAY, -44, @Ahora), DATEADD(DAY, -44, @Ahora)),
 (5, N'OC-5-1', 22990000, NULL,     'DEBITO',  'RECHAZADO',  DATEADD(HOUR, -25, @Ahora), DATEADD(HOUR, -25, @Ahora));

INSERT INTO dbo.Logistica
 (TransaccionId, EmpleadoId, Tipo, DireccionOrigen, UbicacionOrigenId, DireccionDestino,
  UbicacionDestinoId, FechaProgramada, FechaReal, EstadoLogistica)
VALUES
 (1, 1,    'ENTREGA', N'Punto Ruta Providencia, Santiago', 1, N'Los Leones 789, Providencia',  1, DATEADD(DAY, -17, @Ahora), DATEADD(DAY, -17, @Ahora), 'ENTREGADA'),
 (2, 1,    'ENTREGA', N'Punto Ruta Las Condes, Santiago',  2, N'Barros Arana 321, Concepción', 5, DATEADD(DAY, 1,   @Ahora), NULL,                      'EN_TRANSITO'),
 (3, 1,    'ENTREGA', N'Punto Ruta Maipú, Santiago',       3, N'Los Leones 789, Providencia',  1, DATEADD(DAY, -41, @Ahora), DATEADD(DAY, -41, @Ahora), 'ENTREGADA'),
 (4, NULL, 'ENTREGA', N'Punto Ruta Temuco, Cautín',        7, N'Los Leones 789, Providencia',  1, NULL,                      NULL,                      'CANCELADA'),
 (5, NULL, 'ENTREGA', N'Punto Ruta Viña del Mar, Valparaíso', 4, N'Barros Arana 321, Concepción', 5, NULL,                   NULL,                      'PENDIENTE'),
 (6, NULL, 'ENTREGA', N'Punto Ruta Concepción, Concepción', 5, N'Los Leones 789, Providencia', 1, NULL,                      NULL,                      'PENDIENTE');

-- Carritos
INSERT INTO dbo.CarritoItem (UsuarioId, ProductoId, FechaAgregada)
VALUES (5, 4, DATEADD(HOUR, -5, @Ahora)),
       (5, 12, DATEADD(HOUR, -2, @Ahora)),
       (6, 1, DATEADD(HOUR, -8, @Ahora));
GO

/* =====================================================================
   Segundo bloque: mas volumen para que los reportes tengan historia.
   10 usuarios, 24 vehiculos y 11 transacciones de los ultimos 5 meses.
   Los IDs continuan despues del primer bloque (usuarios 8-17,
   vehiculos 21-44, transacciones 7-17).
   ===================================================================== */
SET NOCOUNT ON;

DECLARE @Hash NVARCHAR(255) =
    N'scrypt$cce1274cf9e1ffe4c7881e15f0b9937b$7e0f5e74b07d0e1775367cf4f143eed72d93882f7f5f0e087a1da774b38793c6';
DECLARE @Ahora DATETIME2(0) = SYSUTCDATETIME();
DECLARE @U NVARCHAR(100) = N'https://images.unsplash.com/';
DECLARE @Q NVARCHAR(100) = N'?auto=format&fit=crop&w=900&q=80';

INSERT INTO dbo.Usuario (Nombre, Apellido, Rut, Email, PasswordHash, Telefono, Direccion, Rol, FechaAlta)
VALUES
 (N'Felipe',    N'González',  N'17234567-8', N'felipe@ruta.cl',   @Hash, N'+56911112222', N'Av. Apoquindo 3000, Las Condes',  'VENDEDOR', DATEADD(DAY, -200, @Ahora)), -- 8
 (N'Camila',    N'Muñoz',     N'17345678-9', N'camila@ruta.cl',   @Hash, N'+56922223333', N'Av. Brasil 1500, Valparaíso',     'VENDEDOR', DATEADD(DAY, -190, @Ahora)), -- 9
 (N'Sebastián', N'Rojas',     N'18456789-0', N'seba@ruta.cl',     @Hash, N'+56933334444', N'Irarrázaval 2100, Ñuñoa',         'CLIENTE',  DATEADD(DAY, -170, @Ahora)), -- 10
 (N'Valentina', N'Silva',     N'18567890-1', N'vale@ruta.cl',     @Hash, N'+56944445555', N'Pajaritos 4500, Maipú',           'CLIENTE',  DATEADD(DAY, -165, @Ahora)), -- 11
 (N'Matías',    N'Contreras', N'18678901-2', N'matias@ruta.cl',   @Hash, N'+56955556666', N'Av. Argentina 800, Antofagasta',  'CLIENTE',  DATEADD(DAY, -120, @Ahora)), -- 12
 (N'Fernanda',  N'López',     N'18789012-3', N'fernanda@ruta.cl', @Hash, N'+56966667777', N'Caupolicán 300, Temuco',          'CLIENTE',  DATEADD(DAY, -110, @Ahora)), -- 13
 (N'Benjamín',  N'Torres',    N'19890123-4', N'benja@ruta.cl',    @Hash, N'+56977778888', N'Av. Los Carrera 950, Concepción', 'CLIENTE',  DATEADD(DAY, -100, @Ahora)), -- 14
 (N'Antonia',   N'Araya',     N'19901234-5', N'antonia@ruta.cl',  @Hash, N'+56988889999', N'Av. Libertad 120, Viña del Mar',  'CLIENTE',  DATEADD(DAY, -95,  @Ahora)), -- 15
 (N'Diego',     N'Espinoza',  N'14567890-K', N'diego@ruta.cl',    @Hash, N'+56999990000', NULL,                               'ASESOR',   DATEADD(DAY, -300, @Ahora)), -- 16
 (N'Ignacia',   N'Reyes',     N'20012345-6', N'ignacia@ruta.cl',  @Hash, N'+56912121212', N'Urmeneta 400, Puerto Montt',      'CLIENTE',  DATEADD(DAY, -70,  @Ahora)); -- 17

INSERT INTO dbo.Producto
 (UsuarioVendedorId, MarcaId, CategoriaId, UbicacionId, Modelo, Version, Combustible, Anio,
  Patente, Color, Kilometraje, Transmision, Precio, Descripcion, Estado, FechaPublicacion)
VALUES
 (8,  6, 1, 2, N'Santa Fe',  N'GLS 2.2 CRDi 4x4',  N'Diésel',    2021, N'LPRT31', N'Negro',   52000, 'AUTOMATICA', 26490000, N'Siete asientos, ideal para familia grande.',          'DISPONIBLE', DATEADD(DAY, -7,   @Ahora)), -- 21
 (8,  7, 2, 1, N'Cerato',    N'EX 2.0',            N'Bencina',   2022, N'RKCE42', N'Gris',    24000, 'AUTOMATICA', 14990000, N'Un dueño, mantenciones en la marca.',                 'DISPONIBLE', DATEADD(DAY, -11,  @Ahora)), -- 22
 (9,  8, 4, 3, N'Onix',      N'LT 1.0 Turbo',      N'Bencina',   2023, N'SCHO53', N'Rojo',    15000, 'MANUAL',     11490000, N'Bajo consumo, con garantía vigente.',                 'DISPONIBLE', DATEADD(DAY, -4,   @Ahora)), -- 23
 (9, 10, 2, 4, N'Mazda 3',   N'Sport 2.5',         N'Bencina',   2022, N'RMZD64', N'Azul',    21000, 'AUTOMATICA', 18490000, N'Versión full, head-up display.',                      'DISPONIBLE', DATEADD(DAY, -9,   @Ahora)), -- 24
 (3,  2, 4, 1, N'Polo',      N'Comfortline 1.6',   N'Bencina',   2021, N'LVWP75', N'Blanco',  38000, 'MANUAL',     10990000, N'Revisión técnica por renovar.',                       'DISPONIBLE', DATEADD(DAY, -16,  @Ahora)), -- 25
 (4,  9, 1, 5, N'X-Trail',   N'Advance 2.5',       N'Bencina',   2020, N'KNXT86', N'Plata',   68000, 'CVT',        15490000, N'Parachoques trasero reparado, mecánica al día.',      'DISPONIBLE', DATEADD(DAY, -22,  @Ahora)), -- 26
 (8,  3, 1, 6, N'Territory', N'Titanium 1.5T',     N'Bencina',   2023, N'SFTR97', N'Gris',    19000, 'AUTOMATICA', 21990000, N'Pantalla grande y cámara 360.',                       'DISPONIBLE', DATEADD(DAY, -3,   @Ahora)), -- 27
 (9, 11, 1, 8, N'XV',        N'2.0i AWD',          N'Bencina',   2021, N'LSXV18', N'Naranjo', 44000, 'CVT',        16990000, N'Tracción integral permanente.',                       'DISPONIBLE', DATEADD(DAY, -13,  @Ahora)), -- 28
 (8,  1, 2, 2, N'Corolla',   N'XEI 2.0',           N'Bencina',   2022, N'RTCR29', N'Blanco',  30000, 'CVT',        16490000, N'Impecable, siempre en garage.',                       'DISPONIBLE', DATEADD(DAY, -6,   @Ahora)), -- 29
 (9, 12, 5, 1, N'Seal',      N'Premium 82 kWh',    N'Eléctrico', 2024, N'TBSL30', N'Gris',     3000, 'AUTOMATICA', 32990000, N'570 km de autonomía, carga rápida.',                  'DISPONIBLE', DATEADD(DAY, -1,   @Ahora)), -- 30
 (3,  4, 1, 2, N'HR-V',      N'EXL 1.5T',          N'Bencina',   2023, N'SHHR41', N'Azul',    16000, 'CVT',        22990000, N'Como nuevo.',                                         'DISPONIBLE', DATEADD(DAY, -5,   @Ahora)), -- 31
 (4,  7, 1, 7, N'Sonet',     N'EX 1.5',            N'Bencina',   2023, N'SKSN52', N'Blanco',  11000, 'AUTOMATICA', 15990000, N'SUV compacto, muy equipado.',                         'DISPONIBLE', DATEADD(DAY, -2,   @Ahora)), -- 32
 (8,  8, 3, 6, N'Colorado',  N'LTZ 2.8 4x4',       N'Diésel',    2022, N'RCCL63', N'Blanco',  41000, 'AUTOMATICA', 28990000, N'Lista para faena.',                                   'DISPONIBLE', DATEADD(DAY, -10,  @Ahora)), -- 33
 (9,  5, 1, 4, N'Wrangler',  N'Sport 2.0T',        N'Bencina',   2021, N'LJWR74', N'Verde',   35000, 'AUTOMATICA', 33990000, N'Publicación pausada por viaje del vendedor.',         'PAUSADO',    DATEADD(DAY, -18,  @Ahora)), -- 34
 (8, 10, 1, 2, N'CX-30',     N'R 2.5',             N'Bencina',   2022, N'RMCX85', N'Rojo',    26000, 'AUTOMATICA', 20490000, N'Vendido.',                                            'VENDIDO',    DATEADD(DAY, -70,  @Ahora)), -- 35
 (9,  6, 4, 3, N'i10',       N'GLS 1.2',           N'Bencina',   2021, N'LHIX96', N'Blanco',  33000, 'MANUAL',      7990000, N'Vendido.',                                            'VENDIDO',    DATEADD(DAY, -95,  @Ahora)), -- 36
 (3,  7, 1, 1, N'Seltos',    N'EX 1.6',            N'Bencina',   2022, N'RKSL17', N'Gris',    28000, 'AUTOMATICA', 17990000, N'Vendido.',                                            'VENDIDO',    DATEADD(DAY, -120, @Ahora)), -- 37
 (4,  3, 3, 5, N'Ranger',    N'XLS 2.2 4x4',       N'Diésel',    2020, N'KFRG28', N'Gris',    76000, 'MANUAL',     21490000, N'Vendido.',                                            'VENDIDO',    DATEADD(DAY, -140, @Ahora)), -- 38
 (8,  2, 1, 2, N'Tiguan',    N'Highline 2.0 TSI',  N'Bencina',   2021, N'LVTG39', N'Negro',   47000, 'AUTOMATICA', 24990000, N'Vendido.',                                            'VENDIDO',    DATEADD(DAY, -60,  @Ahora)), -- 39
 (9, 11, 1, 8, N'Outback',   N'2.5i',              N'Bencina',   2020, N'KSOB40', N'Azul',    81000, 'CVT',        17490000, N'Vendido.',                                            'VENDIDO',    DATEADD(DAY, -160, @Ahora)), -- 40
 (3,  8, 1, 7, N'Tracker',   N'Premier 1.2T',      N'Bencina',   2023, N'SCTK51', N'Blanco',  14000, 'AUTOMATICA', 17490000, N'Vendido.',                                            'VENDIDO',    DATEADD(DAY, -40,  @Ahora)), -- 41
 (8,  4, 2, 1, N'Accord',    N'EXL 1.5T',          N'Bencina',   2021, N'LHAC62', N'Gris',    39000, 'CVT',        22490000, N'Reservado.',                                          'RESERVADO',  DATEADD(DAY, -12,  @Ahora)), -- 42
 (9, 12, 5, 2, N'Atto 3',    N'Extended 60 kWh',   N'Eléctrico', 2024, N'TBAT73', N'Blanco',   6000, 'AUTOMATICA', 27990000, N'Reservado.',                                          'RESERVADO',  DATEADD(DAY, -6,   @Ahora)), -- 43
 (4,  6, 1, 4, N'Creta',     N'GLS 1.5',           N'Bencina',   2022, N'RHCR84', N'Rojo',    29000, 'AUTOMATICA', 14490000, N'Disponible otra vez tras una compra rechazada.',      'DISPONIBLE', DATEADD(DAY, -14,  @Ahora)); -- 44

INSERT INTO dbo.Imagen (ProductoId, UrlImagen, EsPrincipal, Orden)
VALUES
 (21, @U + N'photo-1519641471654-76ce0107ad1b' + @Q, 1, 0),
 (22, @U + N'photo-1503376780353-7e6692767b70' + @Q, 1, 0),
 (23, @U + N'photo-1542362567-b07e54358753'    + @Q, 1, 0),
 (24, @U + N'photo-1552519507-da3b142c6e3d'    + @Q, 1, 0),
 (25, @U + N'photo-1549317661-bd32c8ce0db2'    + @Q, 1, 0),
 (26, @U + N'photo-1511919884226-fd3cad34687c' + @Q, 1, 0),
 (27, @U + N'photo-1533473359331-0135ef1b58bf' + @Q, 1, 0),
 (28, @U + N'photo-1492144534655-ae79c964c9d7' + @Q, 1, 0),
 (29, @U + N'photo-1503376780353-7e6692767b70' + @Q, 1, 0),
 (30, @U + N'photo-1542362567-b07e54358753'    + @Q, 1, 0),
 (31, @U + N'photo-1519641471654-76ce0107ad1b' + @Q, 1, 0),
 (32, @U + N'photo-1533473359331-0135ef1b58bf' + @Q, 1, 0),
 (33, @U + N'photo-1551830820-330a71b99659'    + @Q, 1, 0),
 (34, @U + N'photo-1511919884226-fd3cad34687c' + @Q, 1, 0),
 (35, @U + N'photo-1552519507-da3b142c6e3d'    + @Q, 1, 0),
 (36, @U + N'photo-1549317661-bd32c8ce0db2'    + @Q, 1, 0),
 (37, @U + N'photo-1492144534655-ae79c964c9d7' + @Q, 1, 0),
 (38, @U + N'photo-1551830820-330a71b99659'    + @Q, 1, 0),
 (39, @U + N'photo-1519641471654-76ce0107ad1b' + @Q, 1, 0),
 (40, @U + N'photo-1511919884226-fd3cad34687c' + @Q, 1, 0),
 (41, @U + N'photo-1533473359331-0135ef1b58bf' + @Q, 1, 0),
 (42, @U + N'photo-1503376780353-7e6692767b70' + @Q, 1, 0),
 (43, @U + N'photo-1542362567-b07e54358753'    + @Q, 1, 0),
 (44, @U + N'photo-1549317661-bd32c8ce0db2'    + @Q, 1, 0);

INSERT INTO dbo.auto_info_vendedor (ProductoId, MotivoVenta, DuenosAnteriores, Mantenciones)
VALUES
 (21, N'Cambio de ciudad',            1, N'Mantenciones en concesionario'),
 (22, N'Compré un SUV',               1, N'Al día'),
 (23, N'Necesito un auto más grande', 0, N'Primera mantención hecha'),
 (24, N'Cambio de auto',              1, N'Al día'),
 (25, N'Venta rápida',                2, NULL),
 (26, N'Renovación',                  2, N'Cambio de distribución a los 60.000 km'),
 (27, N'Cambio por pick-up',          0, N'Al día'),
 (28, N'Me voy al extranjero',        1, N'Al día'),
 (29, N'Compré un híbrido',           1, N'En concesionario'),
 (30, N'Cambio de modelo',            0, NULL),
 (31, N'Auto de la empresa',          0, N'En concesionario'),
 (32, N'Necesito 7 asientos',         0, NULL),
 (33, N'Término de contrato minero',  1, N'Al día'),
 (34, N'Viaje largo',                 1, NULL),
 (42, N'Cambio de auto',              1, NULL),
 (43, N'Cambio de modelo',            0, NULL),
 (44, N'Cambio de auto',              1, N'Al día');

INSERT INTO dbo.auto_revision (ProductoId, TieneChoques, DetalleDanos, PapelesAlDia, RevisionTecnicaOk, Observaciones, FechaRevision)
VALUES
 (21, 0, NULL,                             1, 1, NULL,                               DATEADD(DAY, -8,  @Ahora)),
 (22, 0, NULL,                             1, 1, N'Neumáticos al 70%',               DATEADD(DAY, -12, @Ahora)),
 (23, 0, NULL,                             1, 1, NULL,                               DATEADD(DAY, -5,  @Ahora)),
 (24, 0, NULL,                             1, 1, NULL,                               DATEADD(DAY, -10, @Ahora)),
 (25, 0, NULL,                             1, 0, N'Revisión técnica vencida',        DATEADD(DAY, -17, @Ahora)),
 (26, 1, N'Parachoques trasero reparado',  1, 1, N'Reparación bien hecha',           DATEADD(DAY, -23, @Ahora)),
 (27, 0, NULL,                             1, 1, NULL,                               DATEADD(DAY, -4,  @Ahora)),
 (28, 0, NULL,                             1, 1, NULL,                               DATEADD(DAY, -14, @Ahora)),
 (29, 0, NULL,                             1, 1, NULL,                               DATEADD(DAY, -7,  @Ahora)),
 (30, 0, NULL,                             1, 1, N'Batería al 100%',                 DATEADD(DAY, -2,  @Ahora)),
 (31, 0, NULL,                             1, 1, NULL,                               DATEADD(DAY, -6,  @Ahora)),
 (33, 0, NULL,                             1, 1, N'Pisadera nueva',                  DATEADD(DAY, -11, @Ahora)),
 (42, 0, NULL,                             1, 1, NULL,                               DATEADD(DAY, -13, @Ahora)),
 (43, 0, NULL,                             1, 1, NULL,                               DATEADD(DAY, -7,  @Ahora)),
 (44, 0, NULL,                             0, 1, N'Falta transferencia del permiso', DATEADD(DAY, -15, @Ahora));

INSERT INTO dbo.HistorialPrecio (ProductoId, PrecioAnterior, PrecioNuevo, FechaCambio)
VALUES
 (22, 15990000, 14990000, DATEADD(DAY, -4,  @Ahora)),
 (26, 16990000, 15490000, DATEADD(DAY, -8,  @Ahora)),
 (28, 17990000, 16990000, DATEADD(DAY, -2,  @Ahora)),
 (24, 17990000, 18490000, DATEADD(DAY, -3,  @Ahora)),
 (35, 21490000, 20490000, DATEADD(DAY, -69, @Ahora));

INSERT INTO dbo.Transaccion
 (UsuarioCompradorId, UsuarioVendedorId, AsesorUsuarioId, ProductoId, PlanId, Fecha, FechaConfirmacion, Monto, Estado)
VALUES
 (10, 8, 2,    35, 3,    DATEADD(DAY, -68,  @Ahora), DATEADD(DAY, -67,  @Ahora), 20490000, 'PAGADA'),    -- 7
 (12, 9, NULL, 36, NULL, DATEADD(DAY, -93,  @Ahora), DATEADD(DAY, -93,  @Ahora),  7990000, 'PAGADA'),    -- 8
 (14, 3, 16,   37, 4,    DATEADD(DAY, -115, @Ahora), DATEADD(DAY, -114, @Ahora), 17990000, 'PAGADA'),    -- 9
 (15, 4, 2,    38, 2,    DATEADD(DAY, -135, @Ahora), DATEADD(DAY, -134, @Ahora), 21490000, 'PAGADA'),    -- 10
 (17, 8, NULL, 39, NULL, DATEADD(DAY, -55,  @Ahora), DATEADD(DAY, -55,  @Ahora), 24990000, 'PAGADA'),    -- 11
 (11, 9, 16,   40, 1,    DATEADD(DAY, -150, @Ahora), DATEADD(DAY, -149, @Ahora), 17490000, 'PAGADA'),    -- 12
 (13, 3, NULL, 41, 4,    DATEADD(DAY, -30,  @Ahora), DATEADD(DAY, -29,  @Ahora), 17490000, 'PAGADA'),    -- 13
 (14, 4, NULL, 44, NULL, DATEADD(DAY, -10,  @Ahora), NULL,                       14490000, 'CANCELADA'), -- 14
 (15, 4, NULL, 44, 2,    DATEADD(DAY, -6,   @Ahora), NULL,                       14490000, 'RECHAZADA'), -- 15
 (11, 8, NULL, 42, 3,    DATEADD(HOUR, -20, @Ahora), NULL,                       22490000, 'PENDIENTE'), -- 16
 (13, 9, 16,   43, 4,    DATEADD(HOUR, -5,  @Ahora), NULL,                       27990000, 'PENDIENTE'); -- 17

INSERT INTO dbo.Pago
 (TransaccionId, OrdenCompra, Monto, CodigoAutorizacion, TipoPago, EstadoPago, FechaCreacion, FechaActualizacion)
VALUES
 ( 7, N'OC-7-1',  20490000, N'552301', 'CREDITO',       'AUTORIZADO', DATEADD(DAY, -67,  @Ahora), DATEADD(DAY, -67,  @Ahora)),
 ( 8, N'OC-8-1',   7990000, N'610044', 'DEBITO',        'AUTORIZADO', DATEADD(DAY, -93,  @Ahora), DATEADD(DAY, -93,  @Ahora)),
 ( 9, N'OC-9-1',  17990000, NULL,      'CREDITO',       'RECHAZADO',  DATEADD(DAY, -115, @Ahora), DATEADD(DAY, -115, @Ahora)),
 ( 9, N'OC-9-2',  17990000, N'208817', 'CREDITO',       'AUTORIZADO', DATEADD(DAY, -114, @Ahora), DATEADD(DAY, -114, @Ahora)),
 (10, N'OC-10-1', 21490000, N'930112', 'TRANSFERENCIA', 'AUTORIZADO', DATEADD(DAY, -134, @Ahora), DATEADD(DAY, -134, @Ahora)),
 (11, N'OC-11-1', 24990000, N'447720', 'DEBITO',        'AUTORIZADO', DATEADD(DAY, -55,  @Ahora), DATEADD(DAY, -55,  @Ahora)),
 (12, N'OC-12-1', 17490000, N'381905', 'CREDITO',       'AUTORIZADO', DATEADD(DAY, -149, @Ahora), DATEADD(DAY, -149, @Ahora)),
 (13, N'OC-13-1', 17490000, N'774410', 'CREDITO',       'AUTORIZADO', DATEADD(DAY, -29,  @Ahora), DATEADD(DAY, -29,  @Ahora)),
 (15, N'OC-15-1', 14490000, NULL,      'DEBITO',        'RECHAZADO',  DATEADD(DAY, -6,   @Ahora), DATEADD(DAY, -6,   @Ahora)),
 (15, N'OC-15-2', 14490000, NULL,      'DEBITO',        'RECHAZADO',  DATEADD(DAY, -6,   @Ahora), DATEADD(DAY, -6,   @Ahora)),
 (15, N'OC-15-3', 14490000, NULL,      'DEBITO',        'RECHAZADO',  DATEADD(DAY, -6,   @Ahora), DATEADD(DAY, -6,   @Ahora)),
 (17, N'OC-17-1', 27990000, NULL,      'CREDITO',       'RECHAZADO',  DATEADD(HOUR, -4,  @Ahora), DATEADD(HOUR, -4,  @Ahora));

INSERT INTO dbo.Logistica
 (TransaccionId, EmpleadoId, Tipo, DireccionOrigen, UbicacionOrigenId, DireccionDestino,
  UbicacionDestinoId, FechaProgramada, FechaReal, EstadoLogistica)
VALUES
 ( 7, 1,    'ENTREGA', N'Punto Ruta Las Condes, Santiago',     2, N'Irarrázaval 2100, Ñuñoa',         1, DATEADD(DAY, -64,  @Ahora), DATEADD(DAY, -64,  @Ahora), 'ENTREGADA'),
 ( 8, 1,    'ENTREGA', N'Punto Ruta Maipú, Santiago',          3, N'Av. Argentina 800, Antofagasta',  6, DATEADD(DAY, -88,  @Ahora), DATEADD(DAY, -87,  @Ahora), 'ENTREGADA'),
 ( 9, 1,    'ENTREGA', N'Punto Ruta Providencia, Santiago',    1, N'Av. Los Carrera 950, Concepción', 5, DATEADD(DAY, -110, @Ahora), DATEADD(DAY, -110, @Ahora), 'ENTREGADA'),
 (10, 1,    'ENTREGA', N'Punto Ruta Concepción, Concepción',   5, N'Av. Libertad 120, Viña del Mar',  4, DATEADD(DAY, -130, @Ahora), DATEADD(DAY, -129, @Ahora), 'ENTREGADA'),
 (11, 1,    'ENTREGA', N'Punto Ruta Las Condes, Santiago',     2, N'Urmeneta 400, Puerto Montt',      8, DATEADD(DAY, -50,  @Ahora), DATEADD(DAY, -49,  @Ahora), 'ENTREGADA'),
 (12, 1,    'ENTREGA', N'Punto Ruta Puerto Montt, Llanquihue', 8, N'Pajaritos 4500, Maipú',           3, DATEADD(DAY, -145, @Ahora), DATEADD(DAY, -144, @Ahora), 'ENTREGADA'),
 (13, 1,    'ENTREGA', N'Punto Ruta Temuco, Cautín',           7, N'Caupolicán 300, Temuco',          7, DATEADD(DAY, -26,  @Ahora), DATEADD(DAY, -26,  @Ahora), 'ENTREGADA'),
 (14, NULL, 'ENTREGA', N'Punto Ruta Viña del Mar, Valparaíso', 4, N'Av. Los Carrera 950, Concepción', 5, NULL, NULL, 'CANCELADA'),
 (15, NULL, 'ENTREGA', N'Punto Ruta Viña del Mar, Valparaíso', 4, N'Av. Libertad 120, Viña del Mar',  4, NULL, NULL, 'CANCELADA'),
 (16, NULL, 'ENTREGA', N'Punto Ruta Providencia, Santiago',    1, N'Pajaritos 4500, Maipú',           3, NULL, NULL, 'PENDIENTE'),
 (17, NULL, 'ENTREGA', N'Punto Ruta Las Condes, Santiago',     2, N'Caupolicán 300, Temuco',          7, NULL, NULL, 'PENDIENTE');

INSERT INTO dbo.CarritoItem (UsuarioId, ProductoId, FechaAgregada)
VALUES (10, 21, DATEADD(HOUR, -30, @Ahora)), (10, 30, DATEADD(HOUR, -3, @Ahora)),
       (12, 27, DATEADD(HOUR, -50, @Ahora)), (12, 31, DATEADD(HOUR, -6, @Ahora)),
       (14, 30, DATEADD(HOUR, -12, @Ahora)), (15, 24, DATEADD(HOUR, -9, @Ahora)),
       (17, 1,  DATEADD(HOUR, -26, @Ahora)), (17, 29, DATEADD(HOUR, -1, @Ahora)),
       (11, 31, DATEADD(HOUR, -4,  @Ahora));
GO
