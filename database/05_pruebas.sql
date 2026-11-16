/*
    05_pruebas.sql
    Pruebas de los objetos SQL: casos normales, casos limite y errores.
    Al final muestra una tabla con el resultado de cada caso (OK = 1).

    ATENCION: modifica datos (crea transacciones, pagos, etc.).
    Ejecutar sobre la base recien cargada y despues restaurarla con:
        pnpm db:init           (desde /backend)
    Desde la consola:  pnpm db:pruebas
*/
USE RutaDB;
GO
SET NOCOUNT ON;

IF OBJECT_ID('tempdb..#R') IS NOT NULL DROP TABLE #R;
CREATE TABLE #R (
    Caso      NVARCHAR(80)  NOT NULL,
    Esperado  NVARCHAR(60)  NOT NULL,
    Obtenido  NVARCHAR(300) NULL,
    OK        BIT           NOT NULL
);

DECLARE @n INT, @s NVARCHAR(30), @t INT;
DECLARE @Busqueda TABLE (
    ProductoId INT, Marca NVARCHAR(50), Modelo NVARCHAR(60), Version NVARCHAR(60),
    Categoria NVARCHAR(40), CategoriaId INT, Anio SMALLINT, Kilometraje INT,
    Transmision NVARCHAR(15), Combustible NVARCHAR(30), Precio DECIMAL(14,2),
    Ciudad NVARCHAR(80), Provincia NVARCHAR(60), ImagenPrincipal NVARCHAR(500),
    FechaPublicacion DATETIME2(0), BajoDePrecio BIT, PrecioAnterior DECIMAL(14,2),
    EsOportunidad BIT, RevisionTecnicaOk BIT, DuenosAnteriores SMALLINT,
    UsuarioVendedorId INT, CuotasReferencia SMALLINT, CuotaReferencia DECIMAL(14,2),
    TotalResultados INT
);

/* ===================== CASOS NORMALES ===================== */

-- N1. Catalogo sin filtros: 28 vehiculos disponibles en los datos de prueba
INSERT INTO @Busqueda EXEC dbo.sp_BuscarVehiculos @TamanoPagina = 50;
SELECT @n = COUNT(*) FROM @Busqueda;
INSERT INTO #R VALUES (N'N1 Catalogo sin filtros', N'28 filas', CONCAT(@n, N' filas'), IIF(@n = 28, 1, 0));

-- N2. Busqueda por texto
DELETE FROM @Busqueda;
INSERT INTO @Busqueda EXEC dbo.sp_BuscarVehiculos @Texto = N'hilux';
SELECT @n = COUNT(*) FROM @Busqueda;
INSERT INTO #R VALUES (N'N2 Busqueda "hilux"', N'1 fila', CONCAT(@n, N' filas'), IIF(@n = 1, 1, 0));

-- N3. Filtros combinados: Pick-up hasta $25.000.000 (solo la Hilux; la Navara esta reservada)
DELETE FROM @Busqueda;
INSERT INTO @Busqueda EXEC dbo.sp_BuscarVehiculos @CategoriaId = 3, @PrecioMax = 25000000;
SELECT @n = COUNT(*) FROM @Busqueda;
INSERT INTO #R VALUES (N'N3 Pick-up <= 25M', N'1 fila (Hilux)', CONCAT(@n, N' filas'), IIF(@n = 1, 1, 0));

-- N4. Vista de ventas por marca
SELECT @n = Vendidos FROM dbo.vw_VentasPorMarca WHERE Marca = N'Toyota';
INSERT INTO #R VALUES (N'N4 vw_VentasPorMarca Toyota', N'1 vendido', CONCAT(@n, N' vendidos'), IIF(@n = 1, 1, 0));

-- N5. Crear transaccion: el vehiculo queda RESERVADO, sale de los carritos y se crea la logistica
INSERT INTO dbo.CarritoItem (UsuarioId, ProductoId) VALUES (6, 10);
EXEC dbo.sp_CrearTransaccion @CompradorId = 5, @ProductoId = 10, @PlanId = 2,
                             @DireccionEntrega = N'Los Leones 789', @UbicacionDestinoId = 1;
SELECT @t = MAX(TransaccionId) FROM dbo.Transaccion WHERE ProductoId = 10;
SELECT @s = Estado FROM dbo.Producto WHERE ProductoId = 10;
SELECT @n = COUNT(*) FROM dbo.CarritoItem WHERE ProductoId = 10;
INSERT INTO #R VALUES (N'N5 sp_CrearTransaccion', N'RESERVADO, 0 en carritos, 1 logistica',
    CONCAT(@s, N', ', @n, N' en carritos, ', (SELECT COUNT(*) FROM dbo.Logistica WHERE TransaccionId = @t), N' logistica'),
    IIF(@s = 'RESERVADO' AND @n = 0 AND EXISTS (SELECT 1 FROM dbo.Logistica WHERE TransaccionId = @t), 1, 0));

-- N6. Pago autorizado: transaccion PAGADA y vehiculo VENDIDO
EXEC dbo.sp_RegistrarPago @TransaccionId = @t, @CompradorId = 5, @TipoPago = N'CREDITO',
                          @ResultadoPasarela = N'AUTORIZADO', @CodigoAutorizacion = N'111222';
SELECT @s = CONCAT(t.Estado, N' / ', p.Estado)
FROM dbo.Transaccion AS t INNER JOIN dbo.Producto AS p ON p.ProductoId = t.ProductoId
WHERE t.TransaccionId = @t;
INSERT INTO #R VALUES (N'N6 sp_RegistrarPago autorizado', N'PAGADA / VENDIDO', @s, IIF(@s = N'PAGADA / VENDIDO', 1, 0));

-- N7. Cambio de precio: queda registrado en el historial
SELECT @n = COUNT(*) FROM dbo.HistorialPrecio WHERE ProductoId = 2;
EXEC dbo.sp_ActualizarPrecioVehiculo @ProductoId = 2, @UsuarioId = 3, @PrecioNuevo = 21490000;
INSERT INTO #R VALUES (N'N7 sp_ActualizarPrecioVehiculo', N'historial +1',
    CONCAT(N'historial ', @n, N' -> ', (SELECT COUNT(*) FROM dbo.HistorialPrecio WHERE ProductoId = 2)),
    IIF((SELECT COUNT(*) FROM dbo.HistorialPrecio WHERE ProductoId = 2) = @n + 1, 1, 0));

-- N8. Cancelar transaccion pendiente: el vehiculo vuelve a DISPONIBLE
EXEC dbo.sp_CancelarTransaccion @TransaccionId = 5, @UsuarioId = 6;
SELECT @s = Estado FROM dbo.Producto WHERE ProductoId = 17;
INSERT INTO #R VALUES (N'N8 sp_CancelarTransaccion', N'vehiculo DISPONIBLE', @s, IIF(@s = 'DISPONIBLE', 1, 0));

/* ===================== CASOS LIMITE ===================== */

-- L1. Ultima pagina incompleta (los disponibles siguen siendo 28: -10 vendido, +17 liberado)
DELETE FROM @Busqueda;
INSERT INTO @Busqueda EXEC dbo.sp_BuscarVehiculos @Pagina = 3, @TamanoPagina = 10;
SELECT @n = COUNT(*) FROM @Busqueda;
INSERT INTO #R VALUES (N'L1 Pagina 3 de tamano 10', N'8 filas', CONCAT(@n, N' filas'), IIF(@n = 8, 1, 0));

-- L2. Rango de precio de un solo valor (min = max) incluye el extremo
DELETE FROM @Busqueda;
INSERT INTO @Busqueda EXEC dbo.sp_BuscarVehiculos @PrecioMin = 8990000, @PrecioMax = 8990000;
SELECT @n = COUNT(*) FROM @Busqueda;
INSERT INTO #R VALUES (N'L2 PrecioMin = PrecioMax', N'1 fila (Rio 5)', CONCAT(@n, N' filas'), IIF(@n = 1, 1, 0));

-- L3. Texto con comodin "%": se busca literal, no devuelve todo
DELETE FROM @Busqueda;
INSERT INTO @Busqueda EXEC dbo.sp_BuscarVehiculos @Texto = N'%';
SELECT @n = COUNT(*) FROM @Busqueda;
INSERT INTO #R VALUES (N'L3 Busqueda "%" (comodin escapado)', N'0 filas', CONCAT(@n, N' filas'), IIF(@n = 0, 1, 0));

-- L4. Rebaja exactamente del 50%: permitida (el limite es "menos de la mitad")
EXEC dbo.sp_ActualizarPrecioVehiculo @ProductoId = 9, @UsuarioId = 3, @PrecioNuevo = 6745000;
SELECT @s = CAST(CAST(Precio AS BIGINT) AS NVARCHAR(30)) FROM dbo.Producto WHERE ProductoId = 9;
INSERT INTO #R VALUES (N'L4 Rebaja de exactamente 50%', N'6745000', @s, IIF(@s = N'6745000', 1, 0));

-- L5. Tercer pago rechazado: la transaccion pasa a RECHAZADA y el vehiculo se libera
EXEC dbo.sp_CrearTransaccion @CompradorId = 6, @ProductoId = 7, @DireccionEntrega = N'Barros Arana 321';
SELECT @t = MAX(TransaccionId) FROM dbo.Transaccion WHERE ProductoId = 7;
EXEC dbo.sp_RegistrarPago @TransaccionId = @t, @CompradorId = 6, @TipoPago = N'DEBITO', @ResultadoPasarela = N'RECHAZADO';
EXEC dbo.sp_RegistrarPago @TransaccionId = @t, @CompradorId = 6, @TipoPago = N'DEBITO', @ResultadoPasarela = N'RECHAZADO';
SELECT @s = Estado FROM dbo.Transaccion WHERE TransaccionId = @t;
INSERT INTO #R VALUES (N'L5a Dos rechazos', N'sigue PENDIENTE', @s, IIF(@s = 'PENDIENTE', 1, 0));
EXEC dbo.sp_RegistrarPago @TransaccionId = @t, @CompradorId = 6, @TipoPago = N'DEBITO', @ResultadoPasarela = N'RECHAZADO';
SELECT @s = CONCAT(t.Estado, N' / ', p.Estado)
FROM dbo.Transaccion AS t INNER JOIN dbo.Producto AS p ON p.ProductoId = t.ProductoId
WHERE t.TransaccionId = @t;
INSERT INTO #R VALUES (N'L5b Tercer rechazo', N'RECHAZADA / DISPONIBLE', @s, IIF(@s = N'RECHAZADA / DISPONIBLE', 1, 0));

/* ===================== ERRORES ESPERADOS ===================== */

BEGIN TRY
    EXEC dbo.sp_CrearTransaccion @CompradorId = 3, @ProductoId = 1, @DireccionEntrega = N'Calle Falsa 123';
    INSERT INTO #R VALUES (N'E1 Comprar vehiculo propio', N'54501', N'no hubo error', 0);
END TRY
BEGIN CATCH
    INSERT INTO #R VALUES (N'E1 Comprar vehiculo propio', N'54501', CONCAT(ERROR_NUMBER(), N' ', ERROR_MESSAGE()), IIF(ERROR_NUMBER() = 54501, 1, 0));
END CATCH;

BEGIN TRY
    EXEC dbo.sp_CrearTransaccion @CompradorId = 6, @ProductoId = 20, @DireccionEntrega = N'Calle Falsa 123';
    INSERT INTO #R VALUES (N'E2 Comprar vehiculo reservado', N'54502', N'no hubo error', 0);
END TRY
BEGIN CATCH
    INSERT INTO #R VALUES (N'E2 Comprar vehiculo reservado', N'54502', CONCAT(ERROR_NUMBER(), N' ', ERROR_MESSAGE()), IIF(ERROR_NUMBER() = 54502, 1, 0));
END CATCH;

BEGIN TRY
    EXEC dbo.sp_CrearTransaccion @CompradorId = 6, @ProductoId = 1, @PlanId = 5, @DireccionEntrega = N'Calle Falsa 123';
    INSERT INTO #R VALUES (N'E3 Plan inactivo', N'54503', N'no hubo error', 0);
END TRY
BEGIN CATCH
    INSERT INTO #R VALUES (N'E3 Plan inactivo', N'54503', CONCAT(ERROR_NUMBER(), N' ', ERROR_MESSAGE()), IIF(ERROR_NUMBER() = 54503, 1, 0));
END CATCH;

-- El rollback de E3 no debe dejar el vehiculo 1 reservado
SELECT @s = Estado FROM dbo.Producto WHERE ProductoId = 1;
INSERT INTO #R VALUES (N'E3b Rollback: vehiculo sigue igual', N'DISPONIBLE', @s, IIF(@s = 'DISPONIBLE', 1, 0));

BEGIN TRY
    EXEC dbo.sp_RegistrarPago @TransaccionId = 6, @CompradorId = 6, @TipoPago = N'DEBITO', @ResultadoPasarela = N'AUTORIZADO';
    INSERT INTO #R VALUES (N'E4 Pagar transaccion ajena', N'52601', N'no hubo error', 0);
END TRY
BEGIN CATCH
    INSERT INTO #R VALUES (N'E4 Pagar transaccion ajena', N'52601', CONCAT(ERROR_NUMBER(), N' ', ERROR_MESSAGE()), IIF(ERROR_NUMBER() = 52601, 1, 0));
END CATCH;

BEGIN TRY
    EXEC dbo.sp_PublicarVehiculo @VendedorId = 3, @MarcaId = 1, @CategoriaId = 1, @UbicacionId = 1,
         @Modelo = N'RAV4', @Combustible = N'Bencina', @Anio = 2022, @Patente = N'rt-pk-45',
         @Kilometraje = 1000, @Transmision = N'CVT', @Precio = 20000000;
    INSERT INTO #R VALUES (N'E5 Patente duplicada (rt-pk-45 = RTPK45)', N'54201', N'no hubo error', 0);
END TRY
BEGIN CATCH
    INSERT INTO #R VALUES (N'E5 Patente duplicada (rt-pk-45 = RTPK45)', N'54201', CONCAT(ERROR_NUMBER(), N' ', ERROR_MESSAGE()), IIF(ERROR_NUMBER() = 54201, 1, 0));
END CATCH;

BEGIN TRY
    EXEC dbo.sp_PublicarVehiculo @VendedorId = 3, @MarcaId = 1, @CategoriaId = 1, @UbicacionId = 1,
         @Modelo = N'RAV4', @Combustible = N'Bencina', @Anio = 2099, @Patente = N'ZZZZ99',
         @Kilometraje = 1000, @Transmision = N'CVT', @Precio = 20000000;
    INSERT INTO #R VALUES (N'E6 Anio futuro', N'51202', N'no hubo error', 0);
END TRY
BEGIN CATCH
    INSERT INTO #R VALUES (N'E6 Anio futuro', N'51202', CONCAT(ERROR_NUMBER(), N' ', ERROR_MESSAGE()), IIF(ERROR_NUMBER() = 51202, 1, 0));
END CATCH;

BEGIN TRY
    EXEC dbo.sp_PublicarVehiculo @VendedorId = 5, @MarcaId = 1, @CategoriaId = 1, @UbicacionId = 1,
         @Modelo = N'RAV4', @Combustible = N'Bencina', @Anio = 2022, @Patente = N'ZZZZ98',
         @Kilometraje = 1000, @Transmision = N'CVT', @Precio = 20000000;
    INSERT INTO #R VALUES (N'E7 Cliente intenta publicar', N'52201', N'no hubo error', 0);
END TRY
BEGIN CATCH
    INSERT INTO #R VALUES (N'E7 Cliente intenta publicar', N'52201', CONCAT(ERROR_NUMBER(), N' ', ERROR_MESSAGE()), IIF(ERROR_NUMBER() = 52201, 1, 0));
END CATCH;

BEGIN TRY
    EXEC dbo.sp_AsignarAsesor @TransaccionId = 6, @AsesorId = 5;
    INSERT INTO #R VALUES (N'E8 Asignar asesor sin rol ASESOR', N'52801', N'no hubo error', 0);
END TRY
BEGIN CATCH
    INSERT INTO #R VALUES (N'E8 Asignar asesor sin rol ASESOR', N'52801', CONCAT(ERROR_NUMBER(), N' ', ERROR_MESSAGE()), IIF(ERROR_NUMBER() = 52801, 1, 0));
END CATCH;

BEGIN TRY
    EXEC dbo.sp_BuscarVehiculos @PrecioMin = 30000000, @PrecioMax = 1000;
    INSERT INTO #R VALUES (N'E9 Rango de precio invertido', N'51003', N'no hubo error', 0);
END TRY
BEGIN CATCH
    INSERT INTO #R VALUES (N'E9 Rango de precio invertido', N'51003', CONCAT(ERROR_NUMBER(), N' ', ERROR_MESSAGE()), IIF(ERROR_NUMBER() = 51003, 1, 0));
END CATCH;

-- Restricciones de la tabla aunque no se use un SP (integridad en el modelo)
BEGIN TRY
    UPDATE dbo.Producto SET Precio = -1 WHERE ProductoId = 1;
    INSERT INTO #R VALUES (N'E10 CHECK precio negativo (UPDATE directo)', N'547', N'no hubo error', 0);
END TRY
BEGIN CATCH
    INSERT INTO #R VALUES (N'E10 CHECK precio negativo (UPDATE directo)', N'547', CONCAT(ERROR_NUMBER(), N' ', LEFT(ERROR_MESSAGE(), 120)), IIF(ERROR_NUMBER() = 547, 1, 0));
END CATCH;

BEGIN TRY
    INSERT INTO dbo.Transaccion (UsuarioCompradorId, UsuarioVendedorId, ProductoId, Monto)
    VALUES (5, 3, 4, 1000000); -- el producto 4 es de Martin (3): FK compuesta valida
    INSERT INTO dbo.Transaccion (UsuarioCompradorId, UsuarioVendedorId, ProductoId, Monto)
    VALUES (6, 3, 4, 1000000); -- segunda PENDIENTE del mismo vehiculo
    INSERT INTO #R VALUES (N'E11 Dos pendientes para un vehiculo', N'2601', N'no hubo error', 0);
END TRY
BEGIN CATCH
    INSERT INTO #R VALUES (N'E11 Dos pendientes para un vehiculo', N'2601', CONCAT(ERROR_NUMBER(), N' ', LEFT(ERROR_MESSAGE(), 120)), IIF(ERROR_NUMBER() = 2601, 1, 0));
END CATCH;

BEGIN TRY
    INSERT INTO dbo.Transaccion (UsuarioCompradorId, UsuarioVendedorId, ProductoId, Monto)
    VALUES (5, 4, 1, 1000000); -- el producto 1 NO es de Paula (4)
    INSERT INTO #R VALUES (N'E12 FK compuesta producto-vendedor', N'547', N'no hubo error', 0);
END TRY
BEGIN CATCH
    INSERT INTO #R VALUES (N'E12 FK compuesta producto-vendedor', N'547', CONCAT(ERROR_NUMBER(), N' ', LEFT(ERROR_MESSAGE(), 120)), IIF(ERROR_NUMBER() = 547, 1, 0));
END CATCH;

/* ===================== RESUMEN ===================== */
SELECT Caso, Esperado, Obtenido, OK FROM #R;
SELECT COUNT(*) AS Casos, SUM(CAST(OK AS INT)) AS Aprobados FROM #R;
GO
