/*
    01_schema.sql
    Modelo relacional del marketplace de vehiculos usados Ruta (15 tablas).
    - Cada vehiculo (Producto) es unico: se identifica por su patente.
    - Una Transaccion corresponde a un unico vehiculo.
    - Montos en DECIMAL(14,2) y fechas en DATETIME2 (UTC).
    Ejecutar despues de 00_create_database.sql.
*/
USE RutaDB;
GO

CREATE TABLE dbo.Usuario (
    UsuarioId INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_Usuario PRIMARY KEY,
    Nombre NVARCHAR(60) NOT NULL,
    Apellido NVARCHAR(60) NOT NULL,
    Rut NVARCHAR(12) NULL,
    Email NVARCHAR(120) NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Telefono NVARCHAR(20) NULL,
    Direccion NVARCHAR(200) NULL,
    Rol NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Usuario_Rol DEFAULT ('CLIENTE'),
    Estado BIT NOT NULL
        CONSTRAINT DF_Usuario_Estado DEFAULT (1),
    FechaAlta DATETIME2(0) NOT NULL
        CONSTRAINT DF_Usuario_FechaAlta DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_Usuario_Email UNIQUE (Email),
    CONSTRAINT CK_Usuario_Email CHECK (Email LIKE '%_@_%._%'),
    CONSTRAINT CK_Usuario_Rol
        CHECK (Rol IN ('CLIENTE', 'VENDEDOR', 'ASESOR', 'ADMIN'))
);
GO

CREATE UNIQUE INDEX UX_Usuario_Rut
    ON dbo.Usuario (Rut)
    WHERE Rut IS NOT NULL;
GO

CREATE TABLE dbo.Ubicacion (
    UbicacionId INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_Ubicacion PRIMARY KEY,
    Provincia NVARCHAR(60) NOT NULL,
    Ciudad NVARCHAR(80) NOT NULL,
    CONSTRAINT UQ_Ubicacion_Provincia_Ciudad UNIQUE (Provincia, Ciudad)
);
GO

CREATE TABLE dbo.Marca (
    MarcaId INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_Marca PRIMARY KEY,
    Nombre NVARCHAR(50) NOT NULL
        CONSTRAINT UQ_Marca_Nombre UNIQUE
);
GO

CREATE TABLE dbo.Categoria (
    CategoriaId INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_Categoria PRIMARY KEY,
    Nombre NVARCHAR(40) NOT NULL
        CONSTRAINT UQ_Categoria_Nombre UNIQUE
);
GO

CREATE TABLE dbo.Producto (
    ProductoId INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_Producto PRIMARY KEY,
    UsuarioVendedorId INT NOT NULL,
    MarcaId INT NOT NULL,
    CategoriaId INT NOT NULL,
    UbicacionId INT NOT NULL,
    Modelo NVARCHAR(60) NOT NULL,
    Combustible NVARCHAR(30) NOT NULL,
    Version NVARCHAR(60) NULL,
    Anio SMALLINT NOT NULL,
    Vin NVARCHAR(17) NULL,
    Patente NVARCHAR(10) NOT NULL,
    Color NVARCHAR(30) NULL,
    Kilometraje INT NOT NULL,
    Transmision NVARCHAR(15) NOT NULL,
    Precio DECIMAL(14,2) NOT NULL,
    Descripcion NVARCHAR(2000) NULL,
    Estado NVARCHAR(15) NOT NULL
        CONSTRAINT DF_Producto_Estado DEFAULT ('DISPONIBLE'),
    FechaPublicacion DATETIME2(0) NOT NULL
        CONSTRAINT DF_Producto_FechaPublicacion DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_Producto_UsuarioVendedor
        FOREIGN KEY (UsuarioVendedorId) REFERENCES dbo.Usuario (UsuarioId),
    CONSTRAINT FK_Producto_Marca
        FOREIGN KEY (MarcaId) REFERENCES dbo.Marca (MarcaId),
    CONSTRAINT FK_Producto_Categoria
        FOREIGN KEY (CategoriaId) REFERENCES dbo.Categoria (CategoriaId),
    CONSTRAINT FK_Producto_Ubicacion
        FOREIGN KEY (UbicacionId) REFERENCES dbo.Ubicacion (UbicacionId),
    CONSTRAINT UQ_Producto_Patente UNIQUE (Patente),
    CONSTRAINT CK_Producto_Patente
        CHECK (LEN(Patente) BETWEEN 5 AND 8 AND Patente NOT LIKE '%[^A-Z0-9]%'),
    CONSTRAINT UQ_Producto_Id_Vendedor UNIQUE (ProductoId, UsuarioVendedorId),
    CONSTRAINT CK_Producto_Anio CHECK (Anio BETWEEN 1886 AND 2100),
    CONSTRAINT CK_Producto_Kilometraje CHECK (Kilometraje >= 0),
    CONSTRAINT CK_Producto_Precio CHECK (Precio > 0),
    CONSTRAINT CK_Producto_Transmision
        CHECK (Transmision IN ('MANUAL', 'AUTOMATICA', 'CVT', 'OTRA')),
    CONSTRAINT CK_Producto_Estado
        CHECK (Estado IN ('DISPONIBLE', 'RESERVADO', 'VENDIDO', 'PAUSADO'))
);
GO

CREATE UNIQUE INDEX UX_Producto_Vin
    ON dbo.Producto (Vin)
    WHERE Vin IS NOT NULL;
GO

CREATE TABLE dbo.PlanFinanciacion (
    PlanId INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_PlanFinanciacion PRIMARY KEY,
    Nombre NVARCHAR(50) NOT NULL,
    CantidadCuotas SMALLINT NOT NULL,
    TasaMensual DECIMAL(6,4) NOT NULL,
    Activo BIT NOT NULL
        CONSTRAINT DF_PlanFinanciacion_Activo DEFAULT (1),
    CONSTRAINT UQ_PlanFinanciacion_Nombre UNIQUE (Nombre),
    CONSTRAINT CK_PlanFinanciacion_Cuotas CHECK (CantidadCuotas > 0),
    CONSTRAINT CK_PlanFinanciacion_Tasa CHECK (TasaMensual >= 0)
);
GO

CREATE TABLE dbo.Transaccion (
    TransaccionId INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_Transaccion PRIMARY KEY,
    UsuarioCompradorId INT NOT NULL,
    UsuarioVendedorId INT NOT NULL,
    AsesorUsuarioId INT NULL,
    ProductoId INT NOT NULL,
    PlanId INT NULL,
    Fecha DATETIME2(0) NOT NULL
        CONSTRAINT DF_Transaccion_Fecha DEFAULT (SYSUTCDATETIME()),
    FechaConfirmacion DATETIME2(0) NULL,
    Monto DECIMAL(14,2) NOT NULL,
    Estado NVARCHAR(15) NOT NULL
        CONSTRAINT DF_Transaccion_Estado DEFAULT ('PENDIENTE'),
    CONSTRAINT FK_Transaccion_Comprador
        FOREIGN KEY (UsuarioCompradorId) REFERENCES dbo.Usuario (UsuarioId),
    CONSTRAINT FK_Transaccion_Vendedor
        FOREIGN KEY (UsuarioVendedorId) REFERENCES dbo.Usuario (UsuarioId),
    CONSTRAINT FK_Transaccion_Asesor
        FOREIGN KEY (AsesorUsuarioId) REFERENCES dbo.Usuario (UsuarioId),
    CONSTRAINT FK_Transaccion_ProductoVendedor
        FOREIGN KEY (ProductoId, UsuarioVendedorId)
        REFERENCES dbo.Producto (ProductoId, UsuarioVendedorId),
    CONSTRAINT FK_Transaccion_Plan
        FOREIGN KEY (PlanId) REFERENCES dbo.PlanFinanciacion (PlanId),
    CONSTRAINT CK_Transaccion_Participantes
        CHECK (UsuarioCompradorId <> UsuarioVendedorId
            AND (AsesorUsuarioId IS NULL OR AsesorUsuarioId <> UsuarioCompradorId)),
    CONSTRAINT CK_Transaccion_Monto CHECK (Monto > 0),
    CONSTRAINT CK_Transaccion_Confirmacion
        CHECK (Estado <> 'PAGADA' OR FechaConfirmacion IS NOT NULL),
    CONSTRAINT CK_Transaccion_Estado
        CHECK (Estado IN ('PENDIENTE', 'PAGADA', 'RECHAZADA',
                          'CANCELADA', 'VENCIDA'))
);
GO

CREATE TABLE dbo.Pago (
    PagoId INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_Pago PRIMARY KEY,
    TransaccionId INT NOT NULL,
    Proveedor NVARCHAR(30) NOT NULL
        CONSTRAINT DF_Pago_Proveedor DEFAULT ('TRANSBANK'),
    TokenTransbank NVARCHAR(500) NULL,
    OrdenCompra NVARCHAR(64) NOT NULL,
    Monto DECIMAL(14,2) NOT NULL,
    CodigoAutorizacion NVARCHAR(30) NULL,
    TipoPago NVARCHAR(30) NOT NULL,
    EstadoPago NVARCHAR(15) NOT NULL
        CONSTRAINT DF_Pago_Estado DEFAULT ('PENDIENTE'),
    FechaCreacion DATETIME2(0) NOT NULL
        CONSTRAINT DF_Pago_Fecha DEFAULT (SYSUTCDATETIME()),
    FechaActualizacion DATETIME2(0) NULL,
    CONSTRAINT FK_Pago_Transaccion
        FOREIGN KEY (TransaccionId) REFERENCES dbo.Transaccion (TransaccionId),
    CONSTRAINT UQ_Pago_OrdenCompra UNIQUE (OrdenCompra),
    CONSTRAINT CK_Pago_Monto CHECK (Monto > 0),
    CONSTRAINT CK_Pago_Tipo
        CHECK (TipoPago IN ('DEBITO', 'CREDITO', 'TRANSFERENCIA', 'OTRO')),
    CONSTRAINT CK_Pago_Estado
        CHECK (EstadoPago IN ('PENDIENTE', 'AUTORIZADO', 'RECHAZADO',
                              'ANULADO', 'REEMBOLSADO'))
);
GO

CREATE TABLE dbo.Imagen (
    ImagenId INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_Imagen PRIMARY KEY,
    ProductoId INT NOT NULL,
    UrlImagen NVARCHAR(500) NOT NULL,
    EsPrincipal BIT NOT NULL
        CONSTRAINT DF_Imagen_EsPrincipal DEFAULT (0),
    Orden SMALLINT NOT NULL
        CONSTRAINT DF_Imagen_Orden DEFAULT (0),
    FechaAlta DATETIME2(0) NOT NULL
        CONSTRAINT DF_Imagen_Fecha DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_Imagen_Producto
        FOREIGN KEY (ProductoId) REFERENCES dbo.Producto (ProductoId),
    CONSTRAINT CK_Imagen_Url CHECK (LEN(LTRIM(RTRIM(UrlImagen))) > 0),
    CONSTRAINT CK_Imagen_Orden CHECK (Orden >= 0)
);
GO

CREATE TABLE dbo.auto_info_vendedor (
    InfoVendedorId INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_auto_info_vendedor PRIMARY KEY,
    ProductoId INT NOT NULL,
    MotivoVenta NVARCHAR(500) NULL,
    DuenosAnteriores SMALLINT NULL,
    Mantenciones NVARCHAR(2000) NULL,
    Comentarios NVARCHAR(2000) NULL,
    FechaPublicacion DATETIME2(0) NOT NULL
        CONSTRAINT DF_auto_info_vendedor_Fecha DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_auto_info_vendedor_Producto
        FOREIGN KEY (ProductoId) REFERENCES dbo.Producto (ProductoId),
    CONSTRAINT UQ_auto_info_vendedor_Producto UNIQUE (ProductoId),
    CONSTRAINT CK_auto_info_vendedor_Duenos
        CHECK (DuenosAnteriores IS NULL OR DuenosAnteriores >= 0)
);
GO

CREATE TABLE dbo.auto_revision (
    RevisionId INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_auto_revision PRIMARY KEY,
    ProductoId INT NOT NULL,
    TieneChoques BIT NOT NULL,
    DetalleDanos NVARCHAR(2000) NULL,
    PapelesAlDia BIT NOT NULL,
    RevisionTecnicaOk BIT NOT NULL,
    Observaciones NVARCHAR(2000) NULL,
    FechaRevision DATETIME2(0) NOT NULL
        CONSTRAINT DF_auto_revision_Fecha DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_auto_revision_Producto
        FOREIGN KEY (ProductoId) REFERENCES dbo.Producto (ProductoId)
);
GO

CREATE TABLE dbo.Empleado (
    EmpleadoId INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_Empleado PRIMARY KEY,
    UsuarioId INT NULL,
    Nombre NVARCHAR(60) NOT NULL,
    Rut NVARCHAR(12) NOT NULL,
    Email NVARCHAR(120) NOT NULL,
    Fono NVARCHAR(20) NULL,
    Cargo NVARCHAR(50) NOT NULL,
    FechaIngreso DATE NOT NULL
        CONSTRAINT DF_Empleado_FechaIngreso DEFAULT (CONVERT(date, SYSUTCDATETIME())),
    Activo BIT NOT NULL
        CONSTRAINT DF_Empleado_Activo DEFAULT (1),
    CONSTRAINT FK_Empleado_Usuario
        FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuario (UsuarioId),
    CONSTRAINT UQ_Empleado_Rut UNIQUE (Rut),
    CONSTRAINT UQ_Empleado_Email UNIQUE (Email)
);
GO

CREATE UNIQUE INDEX UX_Empleado_Usuario
    ON dbo.Empleado (UsuarioId)
    WHERE UsuarioId IS NOT NULL;
GO

CREATE TABLE dbo.Logistica (
    LogisticaId INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_Logistica PRIMARY KEY,
    TransaccionId INT NOT NULL,
    EmpleadoId INT NULL,
    Tipo NVARCHAR(20) NOT NULL,
    DireccionOrigen NVARCHAR(250) NOT NULL,
    UbicacionOrigenId INT NULL,
    DireccionDestino NVARCHAR(250) NOT NULL,
    UbicacionDestinoId INT NULL,
    FechaProgramada DATETIME2(0) NULL,
    FechaReal DATETIME2(0) NULL,
    EstadoLogistica NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Logistica_Estado DEFAULT ('PENDIENTE'),
    Observaciones NVARCHAR(1000) NULL,
    CONSTRAINT FK_Logistica_Transaccion
        FOREIGN KEY (TransaccionId) REFERENCES dbo.Transaccion (TransaccionId),
    CONSTRAINT FK_Logistica_Empleado
        FOREIGN KEY (EmpleadoId) REFERENCES dbo.Empleado (EmpleadoId),
    CONSTRAINT FK_Logistica_UbicacionOrigen
        FOREIGN KEY (UbicacionOrigenId) REFERENCES dbo.Ubicacion (UbicacionId),
    CONSTRAINT FK_Logistica_UbicacionDestino
        FOREIGN KEY (UbicacionDestinoId) REFERENCES dbo.Ubicacion (UbicacionId),
    CONSTRAINT CK_Logistica_Tipo
        CHECK (Tipo IN ('ENTREGA', 'RETIRO', 'TRASLADO')),
    CONSTRAINT CK_Logistica_Estado
        CHECK (EstadoLogistica IN ('PENDIENTE', 'PROGRAMADA', 'EN_TRANSITO',
                                   'ENTREGADA', 'FALLIDA', 'CANCELADA'))
);
GO

CREATE TABLE dbo.HistorialPrecio (
    HistorialId INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_HistorialPrecio PRIMARY KEY,
    ProductoId INT NOT NULL,
    PrecioAnterior DECIMAL(14,2) NOT NULL,
    PrecioNuevo DECIMAL(14,2) NOT NULL,
    FechaCambio DATETIME2(0) NOT NULL
        CONSTRAINT DF_HistorialPrecio_Fecha DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_HistorialPrecio_Producto
        FOREIGN KEY (ProductoId) REFERENCES dbo.Producto (ProductoId),
    CONSTRAINT CK_HistorialPrecio_Precios
        CHECK (PrecioAnterior > 0 AND PrecioNuevo > 0
               AND PrecioAnterior <> PrecioNuevo)
);
GO

CREATE TABLE dbo.CarritoItem (
    UsuarioId INT NOT NULL,
    ProductoId INT NOT NULL,
    FechaAgregada DATETIME2(0) NOT NULL
        CONSTRAINT DF_CarritoItem_Fecha DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_CarritoItem PRIMARY KEY (UsuarioId, ProductoId),
    CONSTRAINT FK_CarritoItem_Usuario
        FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuario (UsuarioId),
    CONSTRAINT FK_CarritoItem_Producto
        FOREIGN KEY (ProductoId) REFERENCES dbo.Producto (ProductoId)
);
GO

CREATE UNIQUE INDEX UX_Imagen_Principal_PorProducto
    ON dbo.Imagen (ProductoId)
    WHERE EsPrincipal = 1;
GO

CREATE UNIQUE INDEX UX_Imagen_Orden_PorProducto
    ON dbo.Imagen (ProductoId, Orden);
GO

CREATE INDEX IX_Producto_Catalogo
    ON dbo.Producto (Estado, MarcaId, CategoriaId, Precio, Anio);
GO

CREATE INDEX IX_Transaccion_Comprador_Fecha
    ON dbo.Transaccion (UsuarioCompradorId, Fecha DESC);
GO

CREATE INDEX IX_Transaccion_Vendedor_Fecha
    ON dbo.Transaccion (UsuarioVendedorId, Fecha DESC);
GO

CREATE INDEX IX_Pago_Transaccion_Fecha
    ON dbo.Pago (TransaccionId, FechaCreacion DESC);
GO

CREATE INDEX IX_Logistica_Transaccion
    ON dbo.Logistica (TransaccionId, EstadoLogistica);
GO

CREATE INDEX IX_auto_revision_Producto_Fecha
    ON dbo.auto_revision (ProductoId, FechaRevision DESC);
GO

CREATE INDEX IX_HistorialPrecio_Producto_Fecha
    ON dbo.HistorialPrecio (ProductoId, FechaCambio DESC);
GO

CREATE UNIQUE INDEX UX_Transaccion_Producto_Activa
    ON dbo.Transaccion (ProductoId)
    WHERE Estado = 'PENDIENTE';
GO
