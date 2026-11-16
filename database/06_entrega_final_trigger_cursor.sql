/*
    06_entrega_final_trigger_cursor.sql
    PROPUESTA PARA LA ENTREGA FINAL (no forma parte del avance 60%).
    No lo ejecuta "pnpm db:init". Esta escrito y probado para la entrega final.

    1) TRIGGER trg_Producto_HistorialPrecio
       Necesidad: RN6 "todo cambio de precio queda registrado, sin importar
       desde donde se haga". Hoy el historial lo escribe sp_ActualizarPrecioVehiculo,
       pero un UPDATE directo (un admin en SSMS, una carga masiva, otro SP
       futuro) lo saltaria. Un trigger AFTER UPDATE es transversal: se
       dispara siempre, venga de donde venga el cambio. Es auditoria, el
       caso de uso que la rubrica menciona para triggers.
       Es set-based: procesa todas las filas de inserted/deleted de una vez,
       asi funciona tambien con un UPDATE que cambie muchos precios.

    2) CURSOR en sp_VencerTransaccionesPendientes
       Necesidad: RN "una transaccion pendiente por mas de 72 horas vence y el
       vehiculo vuelve a estar disponible". Se ejecutaria cada hora
       (SQL Server Agent o un endpoint de administracion).
       Por que cursor y no un UPDATE masivo:
         - Cada vencimiento toca 3 tablas (Transaccion, Producto, Logistica)
           y debe ser atomico POR TRANSACCION: si una falla (p. ej. el
           vehiculo fue modificado a mano y no esta RESERVADO), las demas
           deben vencer igual. Con un UPDATE masivo, un error revierte todo.
         - Se registra el resultado de cada fila en LogProcesoVencimiento
           (OK / ERROR con el mensaje), para auditoria y soporte.
       Reconocemos que el cambio de estado por si solo se podria hacer con
       SQL orientado a conjuntos; el cursor se justifica por el aislamiento
       de errores fila a fila y el registro individual. El volumen esperado
       es bajo (decenas por hora), asi que el costo del cursor no importa.
*/
USE RutaDB;
GO

/* ---------------------------- 1) TRIGGER ---------------------------- */
CREATE OR ALTER TRIGGER dbo.trg_Producto_HistorialPrecio
ON dbo.Producto
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT UPDATE(Precio) RETURN;

    INSERT INTO dbo.HistorialPrecio (ProductoId, PrecioAnterior, PrecioNuevo)
    SELECT i.ProductoId, d.Precio, i.Precio
    FROM inserted AS i
    INNER JOIN deleted AS d ON d.ProductoId = i.ProductoId
    WHERE i.Precio <> d.Precio;
END;
GO

-- Con el trigger activo, el SP ya no inserta en el historial (si no, quedaria doble).
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
        WHERE ProductoId = @ProductoId;   -- trg_Producto_HistorialPrecio registra el cambio

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    SELECT @ProductoId AS ProductoId, @PrecioActual AS PrecioAnterior, @PrecioNuevo AS PrecioNuevo;
END;
GO

/* ---------------------------- 2) CURSOR ---------------------------- */
IF OBJECT_ID(N'dbo.LogProcesoVencimiento', N'U') IS NULL
CREATE TABLE dbo.LogProcesoVencimiento (
    LogId          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LogProcesoVencimiento PRIMARY KEY,
    TransaccionId  INT NOT NULL,
    Resultado      NVARCHAR(10) NOT NULL,
    Mensaje        NVARCHAR(400) NULL,
    FechaProceso   DATETIME2(0) NOT NULL
        CONSTRAINT DF_LogProcesoVencimiento_Fecha DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_LogProcesoVencimiento_Transaccion
        FOREIGN KEY (TransaccionId) REFERENCES dbo.Transaccion (TransaccionId),
    CONSTRAINT CK_LogProcesoVencimiento_Resultado CHECK (Resultado IN ('OK', 'ERROR'))
);
GO

CREATE OR ALTER PROCEDURE dbo.sp_VencerTransaccionesPendientes
    @HorasLimite INT = 72
AS
BEGIN
    SET NOCOUNT ON;

    IF @HorasLimite IS NULL OR @HorasLimite < 1
        THROW 51901, N'Las horas limite deben ser al menos 1.', 1;

    DECLARE @TransaccionId INT, @ProductoId INT, @Vencidas INT = 0, @Errores INT = 0;

    DECLARE cur_pendientes CURSOR LOCAL FAST_FORWARD FOR
        SELECT TransaccionId, ProductoId
        FROM dbo.Transaccion
        WHERE Estado = 'PENDIENTE'
          AND Fecha < DATEADD(HOUR, -@HorasLimite, SYSUTCDATETIME())
        ORDER BY Fecha;   -- las mas antiguas primero

    OPEN cur_pendientes;
    FETCH NEXT FROM cur_pendientes INTO @TransaccionId, @ProductoId;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION;

            UPDATE dbo.Transaccion
            SET Estado = 'VENCIDA'
            WHERE TransaccionId = @TransaccionId AND Estado = 'PENDIENTE';

            IF @@ROWCOUNT = 0
                THROW 54901, N'La transacción cambio de estado durante el proceso.', 1;

            UPDATE dbo.Producto
            SET Estado = 'DISPONIBLE'
            WHERE ProductoId = @ProductoId AND Estado = 'RESERVADO';

            IF @@ROWCOUNT = 0
                THROW 54902, N'El vehículo no estaba RESERVADO; requiere revision manual.', 1;

            UPDATE dbo.Logistica
            SET EstadoLogistica = 'CANCELADA'
            WHERE TransaccionId = @TransaccionId
              AND EstadoLogistica IN ('PENDIENTE', 'PROGRAMADA');

            INSERT INTO dbo.LogProcesoVencimiento (TransaccionId, Resultado, Mensaje)
            VALUES (@TransaccionId, 'OK', N'Transaccion vencida y vehículo liberado.');

            COMMIT TRANSACTION;
            SET @Vencidas += 1;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            -- El error se registra y se sigue con la siguiente fila.
            INSERT INTO dbo.LogProcesoVencimiento (TransaccionId, Resultado, Mensaje)
            VALUES (@TransaccionId, 'ERROR', LEFT(ERROR_MESSAGE(), 400));
            SET @Errores += 1;
        END CATCH;

        FETCH NEXT FROM cur_pendientes INTO @TransaccionId, @ProductoId;
    END;

    CLOSE cur_pendientes;
    DEALLOCATE cur_pendientes;

    SELECT @Vencidas AS Vencidas, @Errores AS Errores;
END;
GO
