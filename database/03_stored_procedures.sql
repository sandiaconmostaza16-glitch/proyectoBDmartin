/*
    03_stored_procedures.sql
    Procedimientos almacenados con la logica de negocio de Ruta.

    Convencion de errores (THROW). La API traduce el numero a un codigo HTTP:
        51xxx -> 400 dato invalido
        52xxx -> 403 sin permiso
        53xxx -> 404 no existe
        54xxx -> 409 conflicto con el estado actual

    | Procedimiento                 | Endpoint                                  |
    |-------------------------------|-------------------------------------------|
    | sp_BuscarVehiculos            | GET   /api/vehiculos                      |
    | sp_RegistrarUsuario           | POST  /api/auth/registro                  |
    | sp_PublicarVehiculo           | POST  /api/vendedor/vehiculos             |
    | sp_ActualizarPrecioVehiculo   | PATCH /api/vendedor/vehiculos/:id/precio  |
    | sp_CambiarEstadoVehiculo      | PATCH /api/vendedor/vehiculos/:id/estado  |
    | sp_CrearTransaccion           | POST  /api/transacciones                  |
    | sp_RegistrarPago              | POST  /api/transacciones/:id/pagos        |
    | sp_CancelarTransaccion        | POST  /api/transacciones/:id/cancelar     |
    | sp_AsignarAsesor              | POST  /api/transacciones/:id/asesor       |
*/
USE RutaDB;
GO

/* ------------------------------------------------------------------------
   sp_BuscarVehiculos
   Catalogo con filtros opcionales, orden y paginacion.
   Cada filtro es opcional con el patron (@p IS NULL OR col = @p), asi no
   hace falta SQL dinamico ni concatenar texto del usuario.
   OPTION (RECOMPILE) evita que un plan armado para un filtro se reuse mal.
------------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_BuscarVehiculos
    @Texto        NVARCHAR(60)  = NULL,
    @MarcaId      INT           = NULL,
    @CategoriaId  INT           = NULL,
    @UbicacionId  INT           = NULL,
    @PrecioMin    DECIMAL(14,2) = NULL,
    @PrecioMax    DECIMAL(14,2) = NULL,
    @AnioMin      SMALLINT      = NULL,
    @AnioMax      SMALLINT      = NULL,
    @Transmision  NVARCHAR(15)  = NULL,
    @Orden        VARCHAR(20)   = 'recientes',
    @Pagina       INT           = 1,
    @TamanoPagina INT           = 12
AS
BEGIN
    SET NOCOUNT ON;

    IF @Pagina IS NULL OR @Pagina < 1
        THROW 51001, N'La página debe ser mayor o igual a 1.', 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina NOT BETWEEN 1 AND 50
        THROW 51002, N'El tamaño de página debe estar entre 1 y 50.', 1;
    IF @PrecioMin IS NOT NULL AND @PrecioMax IS NOT NULL AND @PrecioMin > @PrecioMax
        THROW 51003, N'El precio mínimo no puede ser mayor que el máximo.', 1;
    IF @AnioMin IS NOT NULL AND @AnioMax IS NOT NULL AND @AnioMin > @AnioMax
        THROW 51004, N'El año mínimo no puede ser mayor que el máximo.', 1;
    IF ISNULL(@Orden, '') NOT IN ('recientes', 'precio_asc', 'precio_desc', 'anio', 'km')
        THROW 51005, N'Orden no válido.', 1;

    -- Texto de busqueda: se escapan los comodines de LIKE para que el usuario
    -- no pueda inyectar patrones (% _ [).
    DECLARE @Patron NVARCHAR(200) = NULL;
    IF NULLIF(LTRIM(RTRIM(@Texto)), N'') IS NOT NULL
        SET @Patron = N'%' + REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(@Texto)),
                          N'[', N'[[]'), N'%', N'[%]'), N'_', N'[_]') + N'%';

    -- Plan de mayor cantidad de cuotas activo, para mostrar la cuota referencial.
    DECLARE @PlanCuotas SMALLINT, @PlanTasa DECIMAL(6,4);
    SELECT TOP (1) @PlanCuotas = CantidadCuotas, @PlanTasa = TasaMensual
    FROM dbo.PlanFinanciacion
    WHERE Activo = 1
    ORDER BY CantidadCuotas DESC;

    SELECT
        v.ProductoId, v.Marca, v.Modelo, v.Version, v.Categoria, v.CategoriaId,
        v.Anio, v.Kilometraje, v.Transmision, v.Combustible, v.Precio,
        v.Ciudad, v.Provincia, v.ImagenPrincipal, v.FechaPublicacion,
        v.BajoDePrecio, v.PrecioAnterior, v.EsOportunidad,
        v.RevisionTecnicaOk, v.DuenosAnteriores, v.UsuarioVendedorId,
        @PlanCuotas                                        AS CuotasReferencia,
        dbo.fn_CuotaMensual(v.Precio, @PlanCuotas, @PlanTasa) AS CuotaReferencia,
        COUNT(*) OVER ()                                   AS TotalResultados
    FROM dbo.vw_CatalogoVehiculos AS v
    WHERE v.Estado = 'DISPONIBLE'
      AND (@MarcaId     IS NULL OR v.MarcaId     = @MarcaId)
      AND (@CategoriaId IS NULL OR v.CategoriaId = @CategoriaId)
      AND (@UbicacionId IS NULL OR v.UbicacionId = @UbicacionId)
      AND (@PrecioMin   IS NULL OR v.Precio     >= @PrecioMin)
      AND (@PrecioMax   IS NULL OR v.Precio     <= @PrecioMax)
      AND (@AnioMin     IS NULL OR v.Anio       >= @AnioMin)
      AND (@AnioMax     IS NULL OR v.Anio       <= @AnioMax)
      AND (@Transmision IS NULL OR v.Transmision = @Transmision)
      AND (@Patron      IS NULL OR v.Marca LIKE @Patron
                                OR v.Modelo LIKE @Patron
                                OR v.Version LIKE @Patron
                                OR CONCAT(v.Marca, N' ', v.Modelo) LIKE @Patron)
    ORDER BY
        CASE WHEN @Orden = 'precio_asc'  THEN v.Precio      END ASC,
        CASE WHEN @Orden = 'precio_desc' THEN v.Precio      END DESC,
        CASE WHEN @Orden = 'anio'        THEN v.Anio        END DESC,
        CASE WHEN @Orden = 'km'          THEN v.Kilometraje END ASC,
        v.FechaPublicacion DESC,
        v.ProductoId DESC
    OFFSET (@Pagina - 1) * @TamanoPagina ROWS
    FETCH NEXT @TamanoPagina ROWS ONLY
    OPTION (RECOMPILE);
END;
GO

/* ------------------------------------------------------------------------
   sp_RegistrarUsuario
   Alta de cliente o vendedor. El hash de la contrasena lo calcula la API
   (scrypt); la base nunca recibe la contrasena en texto plano.
   Los roles ASESOR y ADMIN no se pueden auto-asignar.
------------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_RegistrarUsuario
    @Nombre       NVARCHAR(60),
    @Apellido     NVARCHAR(60),
    @Email        NVARCHAR(120),
    @PasswordHash NVARCHAR(255),
    @Rut          NVARCHAR(12) = NULL,
    @Telefono     NVARCHAR(20) = NULL,
    @Rol          NVARCHAR(20) = 'CLIENTE'
AS
BEGIN
    SET NOCOUNT ON;

    SET @Nombre   = LTRIM(RTRIM(@Nombre));
    SET @Apellido = LTRIM(RTRIM(@Apellido));
    SET @Email    = LOWER(LTRIM(RTRIM(@Email)));
    SET @Rut      = NULLIF(UPPER(REPLACE(REPLACE(LTRIM(RTRIM(@Rut)), N'.', N''), N' ', N'')), N'');

    IF NULLIF(@Nombre, N'') IS NULL OR NULLIF(@Apellido, N'') IS NULL
        THROW 51101, N'Nombre y apellido son obligatorios.', 1;
    IF @Email IS NULL OR @Email NOT LIKE N'%_@_%._%' OR @Email LIKE N'% %'
        THROW 51102, N'El correo no tiene un formato válido.', 1;
    IF @Rol NOT IN ('CLIENTE', 'VENDEDOR')
        THROW 52101, N'Solo se puede registrar como CLIENTE o VENDEDOR.', 1;
    IF NULLIF(@PasswordHash, N'') IS NULL
        THROW 51103, N'La contraseña es obligatoria.', 1;
    IF @Rut IS NOT NULL AND @Rut NOT LIKE N'%[0-9]-[0-9K]'
        THROW 51104, N'El RUT debe tener el formato 12345678-9.', 1;
    IF EXISTS (SELECT 1 FROM dbo.Usuario WHERE Email = @Email)
        THROW 54101, N'Ya existe una cuenta con ese correo.', 1;
    IF @Rut IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.Usuario WHERE Rut = @Rut)
        THROW 54102, N'Ya existe una cuenta con ese RUT.', 1;

    INSERT INTO dbo.Usuario (Nombre, Apellido, Rut, Email, PasswordHash, Telefono, Rol)
    OUTPUT INSERTED.UsuarioId, INSERTED.Nombre, INSERTED.Apellido,
           INSERTED.Email, INSERTED.Rol
    VALUES (@Nombre, @Apellido, @Rut, @Email, @PasswordHash, NULLIF(LTRIM(RTRIM(@Telefono)), N''), @Rol);
END;
GO

/* ------------------------------------------------------------------------
   sp_PublicarVehiculo
   Publica un vehiculo con su imagen principal y la informacion del vendedor.
   Son 3 INSERT relacionados: van en una transaccion (todo o nada).
------------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_PublicarVehiculo
    @VendedorId       INT,
    @MarcaId          INT,
    @CategoriaId      INT,
    @UbicacionId      INT,
    @Modelo           NVARCHAR(60),
    @Version          NVARCHAR(60)   = NULL,
    @Combustible      NVARCHAR(30),
    @Anio             SMALLINT,
    @Patente          NVARCHAR(10),
    @Vin              NVARCHAR(17)   = NULL,
    @Color            NVARCHAR(30)   = NULL,
    @Kilometraje      INT,
    @Transmision      NVARCHAR(15),
    @Precio           DECIMAL(14,2),
    @Descripcion      NVARCHAR(2000) = NULL,
    @UrlImagen        NVARCHAR(500)  = NULL,
    @MotivoVenta      NVARCHAR(500)  = NULL,
    @DuenosAnteriores SMALLINT       = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Normalizacion: patente sin guion ni espacios y en mayusculas (AB-CD-12 -> ABCD12)
    SET @Patente = UPPER(REPLACE(REPLACE(LTRIM(RTRIM(@Patente)), N'-', N''), N' ', N''));
    SET @Vin     = NULLIF(UPPER(LTRIM(RTRIM(@Vin))), N'');
    SET @Modelo  = LTRIM(RTRIM(@Modelo));

    IF NOT EXISTS (SELECT 1 FROM dbo.Usuario
                   WHERE UsuarioId = @VendedorId AND Estado = 1
                     AND Rol IN ('VENDEDOR', 'ADMIN'))
        THROW 52201, N'Solo un usuario VENDEDOR activo puede publicar vehículos.', 1;
    IF NULLIF(@Modelo, N'') IS NULL OR NULLIF(LTRIM(RTRIM(@Combustible)), N'') IS NULL
        THROW 51201, N'Modelo y combustible son obligatorios.', 1;
    IF @Anio IS NULL OR @Anio < 1950 OR @Anio > YEAR(SYSUTCDATETIME()) + 1
        THROW 51202, N'El año debe estar entre 1950 y el año siguiente al actual.', 1;
    IF @Kilometraje IS NULL OR @Kilometraje < 0 OR @Kilometraje > 2000000
        THROW 51203, N'El kilometraje debe estar entre 0 y 2.000.000.', 1;
    IF @Precio IS NULL OR @Precio < 500000
        THROW 51204, N'El precio debe ser de al menos $500.000.', 1;
    IF @Patente NOT LIKE N'[A-Z][A-Z][A-Z0-9][A-Z0-9][0-9][0-9]'
        THROW 51205, N'La patente debe tener formato chileno (AB1234 o ABCD12).', 1;
    IF @Vin IS NOT NULL AND LEN(@Vin) <> 17
        THROW 51206, N'El VIN debe tener 17 caracteres.', 1;
    IF @Transmision NOT IN ('MANUAL', 'AUTOMATICA', 'CVT', 'OTRA')
        THROW 51207, N'Transmisión no válida.', 1;
    IF @DuenosAnteriores IS NOT NULL AND @DuenosAnteriores < 0
        THROW 51208, N'Los dueños anteriores no pueden ser negativos.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.Marca WHERE MarcaId = @MarcaId)
        THROW 53201, N'La marca no existe.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE CategoriaId = @CategoriaId)
        THROW 53202, N'La categoría no existe.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.Ubicacion WHERE UbicacionId = @UbicacionId)
        THROW 53203, N'La ubicación no existe.', 1;
    IF EXISTS (SELECT 1 FROM dbo.Producto WHERE Patente = @Patente)
        THROW 54201, N'Ya existe un vehículo publicado con esa patente.', 1;
    IF @Vin IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.Producto WHERE Vin = @Vin)
        THROW 54202, N'Ya existe un vehículo publicado con ese VIN.', 1;

    DECLARE @ProductoId INT;

    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT INTO dbo.Producto
            (UsuarioVendedorId, MarcaId, CategoriaId, UbicacionId, Modelo, Combustible,
             Version, Anio, Vin, Patente, Color, Kilometraje, Transmision, Precio, Descripcion)
        VALUES
            (@VendedorId, @MarcaId, @CategoriaId, @UbicacionId, @Modelo, LTRIM(RTRIM(@Combustible)),
             NULLIF(LTRIM(RTRIM(@Version)), N''), @Anio, @Vin, @Patente,
             NULLIF(LTRIM(RTRIM(@Color)), N''), @Kilometraje, @Transmision, @Precio,
             NULLIF(LTRIM(RTRIM(@Descripcion)), N''));

        SET @ProductoId = SCOPE_IDENTITY();

        IF NULLIF(LTRIM(RTRIM(@UrlImagen)), N'') IS NOT NULL
            INSERT INTO dbo.Imagen (ProductoId, UrlImagen, EsPrincipal, Orden)
            VALUES (@ProductoId, LTRIM(RTRIM(@UrlImagen)), 1, 0);

        INSERT INTO dbo.auto_info_vendedor (ProductoId, MotivoVenta, DuenosAnteriores)
        VALUES (@ProductoId, NULLIF(LTRIM(RTRIM(@MotivoVenta)), N''), @DuenosAnteriores);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    SELECT ProductoId, Marca, Modelo, Anio, Patente, Precio, Estado
    FROM dbo.vw_CatalogoVehiculos
    WHERE ProductoId = @ProductoId;
END;
GO

/* ------------------------------------------------------------------------
   sp_ActualizarPrecioVehiculo
   Cambia el precio publicado y registra el cambio en HistorialPrecio.
   Reglas: solo el duenio (o ADMIN); no se cambia un vehiculo reservado o
   vendido (RN3: la transaccion conserva el precio pactado); una rebaja de
   mas del 50% se rechaza como probable error de digitacion.
   Entrega final: el INSERT al historial pasara al trigger
   trg_Producto_HistorialPrecio (ver 06_entrega_final_trigger_cursor.sql).
------------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_ActualizarPrecioVehiculo
    @ProductoId  INT,
    @UsuarioId   INT,
    @PrecioNuevo DECIMAL(14,2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @PrecioNuevo IS NULL OR @PrecioNuevo < 500000
        THROW 51301, N'El precio debe ser de al menos $500.000.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @PrecioActual DECIMAL(14,2), @Estado NVARCHAR(15), @VendedorId INT;

        SELECT @PrecioActual = Precio, @Estado = Estado, @VendedorId = UsuarioVendedorId
        FROM dbo.Producto WITH (UPDLOCK, ROWLOCK)
        WHERE ProductoId = @ProductoId;

        IF @VendedorId IS NULL
            THROW 53301, N'El vehículo no existe.', 1;
        IF @VendedorId <> @UsuarioId
           AND NOT EXISTS (SELECT 1 FROM dbo.Usuario WHERE UsuarioId = @UsuarioId AND Rol = 'ADMIN')
            THROW 52301, N'Solo el vendedor del vehículo puede cambiar su precio.', 1;
        IF @Estado NOT IN ('DISPONIBLE', 'PAUSADO')
            THROW 54301, N'No se puede cambiar el precio de un vehículo reservado o vendido.', 1;
        IF @PrecioNuevo = @PrecioActual
            THROW 54302, N'El precio nuevo es igual al actual.', 1;
        IF @PrecioNuevo < @PrecioActual * 0.5
            THROW 51302, N'El precio nuevo es menos de la mitad del actual. Revisa el monto ingresado.', 1;

        UPDATE dbo.Producto
        SET Precio = @PrecioNuevo
        WHERE ProductoId = @ProductoId;

        INSERT INTO dbo.HistorialPrecio (ProductoId, PrecioAnterior, PrecioNuevo)
        VALUES (@ProductoId, @PrecioActual, @PrecioNuevo);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    SELECT @ProductoId AS ProductoId, @PrecioActual AS PrecioAnterior, @PrecioNuevo AS PrecioNuevo;
END;
GO

/* ------------------------------------------------------------------------
   sp_CambiarEstadoVehiculo
   Pausa o reactiva una publicacion (DISPONIBLE <-> PAUSADO).
   Al pausar, el vehiculo sale de todos los carritos.
------------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_CambiarEstadoVehiculo
    @ProductoId  INT,
    @UsuarioId   INT,
    @EstadoNuevo NVARCHAR(15)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @EstadoNuevo NOT IN ('DISPONIBLE', 'PAUSADO')
        THROW 51401, N'Solo se puede cambiar a DISPONIBLE o PAUSADO.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @Estado NVARCHAR(15), @VendedorId INT;
        SELECT @Estado = Estado, @VendedorId = UsuarioVendedorId
        FROM dbo.Producto WITH (UPDLOCK, ROWLOCK)
        WHERE ProductoId = @ProductoId;

        IF @VendedorId IS NULL
            THROW 53401, N'El vehículo no existe.', 1;
        IF @VendedorId <> @UsuarioId
           AND NOT EXISTS (SELECT 1 FROM dbo.Usuario WHERE UsuarioId = @UsuarioId AND Rol = 'ADMIN')
            THROW 52401, N'Solo el vendedor del vehículo puede cambiar su estado.', 1;
        IF @Estado NOT IN ('DISPONIBLE', 'PAUSADO')
            THROW 54401, N'Un vehículo reservado o vendido no se puede pausar ni reactivar.', 1;
        IF @Estado = @EstadoNuevo
            THROW 54402, N'El vehículo ya está en ese estado.', 1;

        UPDATE dbo.Producto
        SET Estado = @EstadoNuevo
        WHERE ProductoId = @ProductoId
          AND Estado = @Estado;

        IF @EstadoNuevo = 'PAUSADO'
            DELETE FROM dbo.CarritoItem WHERE ProductoId = @ProductoId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    SELECT @ProductoId AS ProductoId, @Estado AS EstadoAnterior, @EstadoNuevo AS EstadoNuevo;
END;
GO

/* ------------------------------------------------------------------------
   sp_CrearTransaccion  (operacion central)
   El comprador inicia la compra de un vehiculo:
     1. Bloquea la fila del vehiculo (UPDLOCK) para que dos compradores no
        lo reserven al mismo tiempo.
     2. Valida comprador, vehiculo disponible, que no sea propio y el plan.
     3. Crea la transaccion con el precio vigente (RN3), reserva el
        vehiculo, lo quita de todos los carritos y crea la logistica de
        entrega.
   Todo en una transaccion: si algo falla, no queda nada a medias.
------------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_CrearTransaccion
    @CompradorId        INT,
    @ProductoId         INT,
    @PlanId             INT           = NULL,
    @DireccionEntrega   NVARCHAR(250),
    @UbicacionDestinoId INT           = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @DireccionEntrega = LTRIM(RTRIM(@DireccionEntrega));
    IF @DireccionEntrega IS NULL OR LEN(@DireccionEntrega) < 5
        THROW 51501, N'La dirección de entrega es obligatoria (mínimo 5 caracteres).', 1;

    DECLARE @TransaccionId INT;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @Estado NVARCHAR(15), @VendedorId INT, @Precio DECIMAL(14,2),
                @UbicacionOrigenId INT, @DireccionOrigen NVARCHAR(250);

        SELECT @Estado = p.Estado,
               @VendedorId = p.UsuarioVendedorId,
               @Precio = p.Precio,
               @UbicacionOrigenId = p.UbicacionId,
               @DireccionOrigen = CONCAT(N'Punto Ruta ', u.Ciudad, N', ', u.Provincia)
        FROM dbo.Producto AS p WITH (UPDLOCK, ROWLOCK)
        INNER JOIN dbo.Ubicacion AS u ON u.UbicacionId = p.UbicacionId
        WHERE p.ProductoId = @ProductoId;

        IF @VendedorId IS NULL
            THROW 53501, N'El vehículo no existe.', 1;
        IF NOT EXISTS (SELECT 1 FROM dbo.Usuario WHERE UsuarioId = @CompradorId AND Estado = 1)
            THROW 52501, N'El comprador no existe o está inactivo.', 1;
        IF @VendedorId = @CompradorId
            THROW 54501, N'No puedes comprar un vehículo que tú mismo publicaste.', 1;
        IF @Estado <> 'DISPONIBLE'
        BEGIN
            DECLARE @Msg NVARCHAR(200) = CONCAT(N'El vehículo no está disponible (estado actual: ', @Estado, N').');
            THROW 54502, @Msg, 1;
        END;
        IF @PlanId IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM dbo.PlanFinanciacion WHERE PlanId = @PlanId AND Activo = 1)
            THROW 54503, N'El plan de financiamiento no existe o no está vigente.', 1;
        IF @UbicacionDestinoId IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM dbo.Ubicacion WHERE UbicacionId = @UbicacionDestinoId)
            THROW 53502, N'La ciudad de destino no existe.', 1;

        INSERT INTO dbo.Transaccion
            (UsuarioCompradorId, UsuarioVendedorId, ProductoId, PlanId, Monto, Estado)
        VALUES
            (@CompradorId, @VendedorId, @ProductoId, @PlanId, @Precio, 'PENDIENTE');

        SET @TransaccionId = SCOPE_IDENTITY();

        UPDATE dbo.Producto
        SET Estado = 'RESERVADO'
        WHERE ProductoId = @ProductoId
          AND Estado = 'DISPONIBLE';

        DELETE FROM dbo.CarritoItem
        WHERE ProductoId = @ProductoId;

        INSERT INTO dbo.Logistica
            (TransaccionId, Tipo, DireccionOrigen, UbicacionOrigenId,
             DireccionDestino, UbicacionDestinoId, EstadoLogistica)
        VALUES
            (@TransaccionId, 'ENTREGA', @DireccionOrigen, @UbicacionOrigenId,
             @DireccionEntrega, @UbicacionDestinoId, 'PENDIENTE');

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    SELECT *
    FROM dbo.vw_TransaccionesDetalle
    WHERE TransaccionId = @TransaccionId;
END;
GO

/* ------------------------------------------------------------------------
   sp_RegistrarPago
   Registra el resultado de la pasarela de pago para una transaccion.
   - AUTORIZADO: transaccion PAGADA, vehiculo VENDIDO, entrega PROGRAMADA.
   - RECHAZADO: queda el intento registrado y la transaccion sigue PENDIENTE.
   Limite: 3 intentos rechazados; al tercero la transaccion se cancela y el
   vehiculo vuelve a estar disponible.
------------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_RegistrarPago
    @TransaccionId      INT,
    @CompradorId        INT,
    @TipoPago           NVARCHAR(30),
    @ResultadoPasarela  NVARCHAR(15),
    @CodigoAutorizacion NVARCHAR(30)  = NULL,
    @TokenTransbank     NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @TipoPago NOT IN ('DEBITO', 'CREDITO', 'TRANSFERENCIA', 'OTRO')
        THROW 51601, N'Tipo de pago no válido.', 1;
    IF @ResultadoPasarela NOT IN ('AUTORIZADO', 'RECHAZADO')
        THROW 51602, N'Resultado de pasarela no válido.', 1;

    DECLARE @PagoId INT, @EstadoFinal NVARCHAR(15);

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @Estado NVARCHAR(15), @Comprador INT, @ProductoId INT,
                @Monto DECIMAL(14,2), @Intento INT, @Rechazados INT;

        SELECT @Estado = Estado, @Comprador = UsuarioCompradorId,
               @ProductoId = ProductoId, @Monto = Monto
        FROM dbo.Transaccion WITH (UPDLOCK, ROWLOCK)
        WHERE TransaccionId = @TransaccionId;

        IF @Comprador IS NULL
            THROW 53601, N'La transacción no existe.', 1;
        IF @Comprador <> @CompradorId
            THROW 52601, N'Solo el comprador puede pagar esta transacción.', 1;
        IF @Estado <> 'PENDIENTE'
        BEGIN
            DECLARE @Msg NVARCHAR(200) = CONCAT(N'La transacción no admite pagos (estado: ', @Estado, N').');
            THROW 54601, @Msg, 1;
        END;

        SELECT @Intento = COUNT(*) + 1,
               @Rechazados = SUM(CASE WHEN EstadoPago = 'RECHAZADO' THEN 1 ELSE 0 END)
        FROM dbo.Pago
        WHERE TransaccionId = @TransaccionId;

        INSERT INTO dbo.Pago
            (TransaccionId, TokenTransbank, OrdenCompra, Monto, CodigoAutorizacion,
             TipoPago, EstadoPago, FechaActualizacion)
        VALUES
            (@TransaccionId, @TokenTransbank,
             CONCAT(N'OC-', @TransaccionId, N'-', @Intento),
             @Monto,
             CASE WHEN @ResultadoPasarela = 'AUTORIZADO' THEN @CodigoAutorizacion END,
             @TipoPago, @ResultadoPasarela, SYSUTCDATETIME());

        SET @PagoId = SCOPE_IDENTITY();

        IF @ResultadoPasarela = 'AUTORIZADO'
        BEGIN
            UPDATE dbo.Transaccion
            SET Estado = 'PAGADA', FechaConfirmacion = SYSUTCDATETIME()
            WHERE TransaccionId = @TransaccionId;

            UPDATE dbo.Producto
            SET Estado = 'VENDIDO'
            WHERE ProductoId = @ProductoId AND Estado = 'RESERVADO';

            UPDATE dbo.Logistica
            SET EstadoLogistica = 'PROGRAMADA',
                FechaProgramada = DATEADD(DAY, 3, SYSUTCDATETIME())
            WHERE TransaccionId = @TransaccionId AND EstadoLogistica = 'PENDIENTE';

            SET @EstadoFinal = 'PAGADA';
        END
        ELSE IF ISNULL(@Rechazados, 0) + 1 >= 3
        BEGIN
            -- Tercer rechazo: se libera el vehiculo
            UPDATE dbo.Transaccion SET Estado = 'RECHAZADA'
            WHERE TransaccionId = @TransaccionId;

            UPDATE dbo.Producto SET Estado = 'DISPONIBLE'
            WHERE ProductoId = @ProductoId AND Estado = 'RESERVADO';

            UPDATE dbo.Logistica SET EstadoLogistica = 'CANCELADA'
            WHERE TransaccionId = @TransaccionId
              AND EstadoLogistica IN ('PENDIENTE', 'PROGRAMADA');

            SET @EstadoFinal = 'RECHAZADA';
        END
        ELSE
            SET @EstadoFinal = 'PENDIENTE';

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    SELECT p.PagoId, p.OrdenCompra, p.Monto, p.EstadoPago, p.CodigoAutorizacion,
           @EstadoFinal AS EstadoTransaccion
    FROM dbo.Pago AS p
    WHERE p.PagoId = @PagoId;
END;
GO

/* ------------------------------------------------------------------------
   sp_CancelarTransaccion
   Cancela una transaccion PENDIENTE y libera el vehiculo.
   Pueden cancelar: comprador, vendedor, asesor asignado o ADMIN.
------------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_CancelarTransaccion
    @TransaccionId INT,
    @UsuarioId     INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @Estado NVARCHAR(15), @Comprador INT, @Vendedor INT,
                @Asesor INT, @ProductoId INT;

        SELECT @Estado = Estado, @Comprador = UsuarioCompradorId,
               @Vendedor = UsuarioVendedorId, @Asesor = AsesorUsuarioId,
               @ProductoId = ProductoId
        FROM dbo.Transaccion WITH (UPDLOCK, ROWLOCK)
        WHERE TransaccionId = @TransaccionId;

        IF @Comprador IS NULL
            THROW 53701, N'La transacción no existe.', 1;
        IF @UsuarioId NOT IN (@Comprador, @Vendedor, ISNULL(@Asesor, -1))
           AND NOT EXISTS (SELECT 1 FROM dbo.Usuario WHERE UsuarioId = @UsuarioId AND Rol = 'ADMIN')
            THROW 52701, N'No participas en esta transacción.', 1;
        IF @Estado <> 'PENDIENTE'
            THROW 54701, N'Solo se puede cancelar una transacción pendiente.', 1;

        UPDATE dbo.Transaccion
        SET Estado = 'CANCELADA'
        WHERE TransaccionId = @TransaccionId AND Estado = 'PENDIENTE';

        UPDATE dbo.Producto
        SET Estado = 'DISPONIBLE'
        WHERE ProductoId = @ProductoId AND Estado = 'RESERVADO';

        UPDATE dbo.Logistica
        SET EstadoLogistica = 'CANCELADA'
        WHERE TransaccionId = @TransaccionId
          AND EstadoLogistica IN ('PENDIENTE', 'PROGRAMADA');

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    SELECT @TransaccionId AS TransaccionId, 'CANCELADA' AS Estado;
END;
GO

/* ------------------------------------------------------------------------
   sp_AsignarAsesor
   Un asesor toma una transaccion pendiente para acompanar la compra.
------------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_AsignarAsesor
    @TransaccionId INT,
    @AsesorId      INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Usuario
                   WHERE UsuarioId = @AsesorId AND Rol = 'ASESOR' AND Estado = 1)
        THROW 52801, N'Solo un usuario ASESOR activo puede tomar transacciones.', 1;

    DECLARE @Estado NVARCHAR(15), @Comprador INT, @AsesorActual INT;
    SELECT @Estado = Estado, @Comprador = UsuarioCompradorId, @AsesorActual = AsesorUsuarioId
    FROM dbo.Transaccion
    WHERE TransaccionId = @TransaccionId;

    IF @Estado IS NULL
        THROW 53801, N'La transacción no existe.', 1;
    IF @Estado <> 'PENDIENTE'
        THROW 54801, N'Solo se asignan asesores a transacciones pendientes.', 1;
    IF @AsesorActual IS NOT NULL AND @AsesorActual <> @AsesorId
        THROW 54802, N'La transacción ya tiene otro asesor asignado.', 1;
    IF @Comprador = @AsesorId
        THROW 54803, N'El asesor no puede ser el comprador.', 1;

    UPDATE dbo.Transaccion
    SET AsesorUsuarioId = @AsesorId
    WHERE TransaccionId = @TransaccionId
      AND Estado = 'PENDIENTE';

    SELECT TransaccionId, Asesor, Estado
    FROM dbo.vw_TransaccionesDetalle
    WHERE TransaccionId = @TransaccionId;
END;
GO
