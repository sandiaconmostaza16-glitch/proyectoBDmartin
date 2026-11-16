/*
    02_views.sql
    Funcion de calculo de cuotas y vistas que usa la aplicacion.

    | Objeto                   | Lo usa                                              |
    |--------------------------|-----------------------------------------------------|
    | fn_CuotaMensual          | sp_BuscarVehiculos, detalle de vehiculo, compras    |
    | vw_CatalogoVehiculos     | sp_BuscarVehiculos, GET /api/vehiculos/:id, carrito |
    | vw_TransaccionesDetalle  | Mis compras, Mis ventas, panel del asesor           |
    | vw_VentasPorMarca        | Panel de reportes (GET /api/reportes/ventas-marca)  |
*/
USE RutaDB;
GO

/*
    Cuota mensual con sistema frances (cuota fija):
        cuota = monto * i / (1 - (1 + i)^-n)
    Si la tasa es 0, la cuota es monto / n.
*/
CREATE OR ALTER FUNCTION dbo.fn_CuotaMensual
(
    @Monto DECIMAL(14,2),
    @Cuotas SMALLINT,
    @TasaMensual DECIMAL(6,4)
)
RETURNS DECIMAL(14,2)
AS
BEGIN
    IF @Monto IS NULL OR @Cuotas IS NULL OR @Cuotas <= 0 OR @TasaMensual IS NULL
        RETURN NULL;

    IF @TasaMensual = 0
        RETURN ROUND(@Monto / @Cuotas, 0);

    DECLARE @i FLOAT = CAST(@TasaMensual AS FLOAT);
    RETURN ROUND(CAST(@Monto AS FLOAT) * @i / (1 - POWER(1 + @i, -CAST(@Cuotas AS FLOAT))), 0);
END;
GO

/*
    vw_CatalogoVehiculos
    Una fila por vehiculo con todo lo que muestra la tarjeta y el detalle:
    marca, categoria, ubicacion, vendedor, imagen principal, ultimo cambio
    de precio ("Bajo de precio"), ultima revision tecnica y comparacion con
    el precio promedio de su categoria ("Oportunidad").
    Evita repetir 6 JOIN y 3 subconsultas en cada consulta del catalogo.
*/
CREATE OR ALTER VIEW dbo.vw_CatalogoVehiculos
AS
SELECT
    p.ProductoId,
    p.UsuarioVendedorId,
    CONCAT(u.Nombre, N' ', u.Apellido)          AS Vendedor,
    p.MarcaId,
    m.Nombre                                    AS Marca,
    p.CategoriaId,
    c.Nombre                                    AS Categoria,
    p.UbicacionId,
    ub.Ciudad,
    ub.Provincia,
    p.Modelo,
    p.Version,
    p.Combustible,
    p.Anio,
    p.Patente,
    p.Color,
    p.Kilometraje,
    p.Transmision,
    p.Precio,
    p.Descripcion,
    p.Estado,
    p.FechaPublicacion,
    img.UrlImagen                               AS ImagenPrincipal,
    hp.PrecioAnterior,
    hp.FechaCambio                              AS FechaUltimoCambioPrecio,
    CAST(CASE WHEN hp.PrecioNuevo < hp.PrecioAnterior
              THEN 1 ELSE 0 END AS BIT)         AS BajoDePrecio,
    rev.RevisionTecnicaOk,
    rev.TieneChoques,
    rev.PapelesAlDia,
    info.DuenosAnteriores,
    prom.PrecioPromedioCategoria,
    CAST(CASE WHEN p.Precio < prom.PrecioPromedioCategoria * 0.90
              THEN 1 ELSE 0 END AS BIT)         AS EsOportunidad
FROM dbo.Producto AS p
INNER JOIN dbo.Marca     AS m  ON m.MarcaId = p.MarcaId
INNER JOIN dbo.Categoria AS c  ON c.CategoriaId = p.CategoriaId
INNER JOIN dbo.Ubicacion AS ub ON ub.UbicacionId = p.UbicacionId
INNER JOIN dbo.Usuario   AS u  ON u.UsuarioId = p.UsuarioVendedorId
LEFT JOIN dbo.Imagen     AS img
       ON img.ProductoId = p.ProductoId AND img.EsPrincipal = 1
LEFT JOIN dbo.auto_info_vendedor AS info
       ON info.ProductoId = p.ProductoId
OUTER APPLY (
    -- Ultimo cambio de precio registrado
    SELECT TOP (1) h.PrecioAnterior, h.PrecioNuevo, h.FechaCambio
    FROM dbo.HistorialPrecio AS h
    WHERE h.ProductoId = p.ProductoId
    ORDER BY h.FechaCambio DESC, h.HistorialId DESC
) AS hp
OUTER APPLY (
    -- Revision tecnica mas reciente
    SELECT TOP (1) r.RevisionTecnicaOk, r.TieneChoques, r.PapelesAlDia
    FROM dbo.auto_revision AS r
    WHERE r.ProductoId = p.ProductoId
    ORDER BY r.FechaRevision DESC, r.RevisionId DESC
) AS rev
OUTER APPLY (
    -- Precio promedio de los vehiculos disponibles de la misma categoria
    SELECT AVG(p2.Precio) AS PrecioPromedioCategoria
    FROM dbo.Producto AS p2
    WHERE p2.CategoriaId = p.CategoriaId
      AND p2.Estado = 'DISPONIBLE'
) AS prom;
GO

/*
    vw_TransaccionesDetalle
    Una fila por transaccion con comprador, vendedor, asesor, vehiculo,
    plan (y su cuota), total pagado, intentos de pago y estado logistico.
*/
CREATE OR ALTER VIEW dbo.vw_TransaccionesDetalle
AS
SELECT
    t.TransaccionId,
    t.Fecha,
    t.FechaConfirmacion,
    t.Monto,
    t.Estado,
    DATEDIFF(HOUR, t.Fecha, SYSUTCDATETIME())   AS HorasDesdeCreacion,
    t.UsuarioCompradorId,
    CONCAT(uc.Nombre, N' ', uc.Apellido)        AS Comprador,
    uc.Email                                    AS EmailComprador,
    t.UsuarioVendedorId,
    CONCAT(uv.Nombre, N' ', uv.Apellido)        AS Vendedor,
    t.AsesorUsuarioId,
    CASE WHEN ua.UsuarioId IS NULL THEN NULL
         ELSE CONCAT(ua.Nombre, N' ', ua.Apellido) END AS Asesor,
    t.ProductoId,
    m.Nombre                                    AS Marca,
    p.Modelo,
    p.Version,
    p.Anio,
    p.Patente,
    p.Estado                                    AS EstadoVehiculo,
    img.UrlImagen                               AS ImagenPrincipal,
    t.PlanId,
    pf.Nombre                                   AS PlanNombre,
    pf.CantidadCuotas,
    pf.TasaMensual,
    CASE WHEN pf.PlanId IS NULL THEN NULL
         ELSE dbo.fn_CuotaMensual(t.Monto, pf.CantidadCuotas, pf.TasaMensual)
    END                                         AS CuotaMensual,
    ISNULL(pg.TotalPagado, 0)                   AS TotalPagado,
    ISNULL(pg.IntentosPago, 0)                  AS IntentosPago,
    pg.IntentosRechazados,
    up.EstadoPago                               AS UltimoEstadoPago,
    lg.EstadoLogistica,
    lg.FechaProgramada,
    lg.DireccionDestino
FROM dbo.Transaccion AS t
INNER JOIN dbo.Usuario  AS uc ON uc.UsuarioId = t.UsuarioCompradorId
INNER JOIN dbo.Usuario  AS uv ON uv.UsuarioId = t.UsuarioVendedorId
LEFT JOIN dbo.Usuario   AS ua ON ua.UsuarioId = t.AsesorUsuarioId
INNER JOIN dbo.Producto AS p  ON p.ProductoId = t.ProductoId
INNER JOIN dbo.Marca    AS m  ON m.MarcaId = p.MarcaId
LEFT JOIN dbo.Imagen    AS img
       ON img.ProductoId = p.ProductoId AND img.EsPrincipal = 1
LEFT JOIN dbo.PlanFinanciacion AS pf ON pf.PlanId = t.PlanId
OUTER APPLY (
    SELECT SUM(CASE WHEN pa.EstadoPago = 'AUTORIZADO' THEN pa.Monto ELSE 0 END) AS TotalPagado,
           COUNT(*)                                                           AS IntentosPago,
           SUM(CASE WHEN pa.EstadoPago = 'RECHAZADO' THEN 1 ELSE 0 END)       AS IntentosRechazados
    FROM dbo.Pago AS pa
    WHERE pa.TransaccionId = t.TransaccionId
) AS pg
OUTER APPLY (
    SELECT TOP (1) pa.EstadoPago
    FROM dbo.Pago AS pa
    WHERE pa.TransaccionId = t.TransaccionId
    ORDER BY pa.FechaCreacion DESC, pa.PagoId DESC
) AS up
OUTER APPLY (
    SELECT TOP (1) l.EstadoLogistica, l.FechaProgramada, l.DireccionDestino
    FROM dbo.Logistica AS l
    WHERE l.TransaccionId = t.TransaccionId
    ORDER BY l.LogisticaId DESC
) AS lg;
GO

/*
    vw_VentasPorMarca
    Indicadores por marca para el panel de reportes: publicados, disponibles,
    reservados, vendidos, monto vendido y ticket promedio.
    LEFT JOIN para que aparezcan tambien las marcas sin ventas.
*/
CREATE OR ALTER VIEW dbo.vw_VentasPorMarca
AS
SELECT
    m.MarcaId,
    m.Nombre                                                   AS Marca,
    COUNT(p.ProductoId)                                        AS VehiculosPublicados,
    SUM(CASE WHEN p.Estado = 'DISPONIBLE' THEN 1 ELSE 0 END)   AS Disponibles,
    SUM(CASE WHEN p.Estado = 'RESERVADO'  THEN 1 ELSE 0 END)   AS Reservados,
    SUM(CASE WHEN p.Estado = 'VENDIDO'    THEN 1 ELSE 0 END)   AS Vendidos,
    ISNULL(SUM(tv.Monto), 0)                                   AS MontoVendido,
    AVG(tv.Monto)                                              AS TicketPromedio,
    AVG(p.Precio)                                              AS PrecioPromedioPublicado
FROM dbo.Marca AS m
LEFT JOIN dbo.Producto AS p
       ON p.MarcaId = m.MarcaId
LEFT JOIN dbo.Transaccion AS tv
       ON tv.ProductoId = p.ProductoId
      AND tv.Estado = 'PAGADA'
GROUP BY m.MarcaId, m.Nombre;
GO
