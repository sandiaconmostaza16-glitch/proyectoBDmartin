/*
 * Reportes del panel (ADMIN / ASESOR).
 */
import { getConnection, sql } from '../config/db.js';

/** Indicadores generales con subconsultas escalares. */
export async function resumen() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.Producto WHERE Estado = 'DISPONIBLE')     AS VehiculosDisponibles,
      (SELECT COUNT(*) FROM dbo.Producto WHERE Estado = 'RESERVADO')      AS VehiculosReservados,
      (SELECT COUNT(*) FROM dbo.Transaccion WHERE Estado = 'PENDIENTE')   AS TransaccionesPendientes,
      (SELECT COUNT(*) FROM dbo.Transaccion
        WHERE Estado = 'PENDIENTE'
          AND Fecha < DATEADD(HOUR, -72, SYSUTCDATETIME()))               AS PendientesVencidas,
      (SELECT COUNT(*) FROM dbo.Transaccion WHERE Estado = 'PAGADA')      AS Ventas,
      (SELECT ISNULL(SUM(Monto), 0) FROM dbo.Transaccion
        WHERE Estado = 'PAGADA')                                          AS MontoVendido,
      (SELECT AVG(CAST(DATEDIFF(DAY, p.FechaPublicacion, t.FechaConfirmacion) AS DECIMAL(10,1)))
         FROM dbo.Transaccion AS t
         INNER JOIN dbo.Producto AS p ON p.ProductoId = t.ProductoId
        WHERE t.Estado = 'PAGADA')                                        AS DiasPromedioVenta,
      (SELECT CAST(100.0 * SUM(CASE WHEN EstadoPago = 'RECHAZADO' THEN 1 ELSE 0 END)
                   / NULLIF(COUNT(*), 0) AS DECIMAL(5,1))
         FROM dbo.Pago)                                                   AS PorcentajePagosRechazados;
  `);
  return result.recordset[0];
}

/** Usa la vista vw_VentasPorMarca. */
export async function ventasPorMarca() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT Marca, VehiculosPublicados, Disponibles, Reservados, Vendidos,
           MontoVendido, TicketPromedio, PrecioPromedioPublicado
    FROM dbo.vw_VentasPorMarca
    WHERE VehiculosPublicados > 0
    ORDER BY MontoVendido DESC, Marca;
  `);
  return result.recordset;
}

/**
 * Demanda por categoria: vehiculos disponibles, interes (carritos) y
 * transacciones. Solo categorias con alguna actividad (HAVING).
 */
export async function demandaPorCategoria() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT c.Nombre                                                AS Categoria,
           SUM(CASE WHEN p.Estado = 'DISPONIBLE' THEN 1 ELSE 0 END) AS Disponibles,
           SUM(ISNULL(car.Cantidad, 0))                             AS EnCarritos,
           SUM(ISNULL(tr.Cantidad, 0))                              AS Transacciones,
           AVG(p.Precio)                                            AS PrecioPromedio
    FROM dbo.Categoria AS c
    INNER JOIN dbo.Producto AS p ON p.CategoriaId = c.CategoriaId
    LEFT JOIN (SELECT ProductoId, COUNT(*) AS Cantidad
               FROM dbo.CarritoItem GROUP BY ProductoId) AS car
           ON car.ProductoId = p.ProductoId
    LEFT JOIN (SELECT ProductoId, COUNT(*) AS Cantidad
               FROM dbo.Transaccion GROUP BY ProductoId) AS tr
           ON tr.ProductoId = p.ProductoId
    GROUP BY c.Nombre
    HAVING SUM(ISNULL(car.Cantidad, 0)) + SUM(ISNULL(tr.Cantidad, 0)) > 0
    ORDER BY Transacciones DESC, EnCarritos DESC;
  `);
  return result.recordset;
}

/** Vehiculos publicados hace mas de @Dias dias sin transacciones: candidatos a rebaja. */
export async function publicacionesSinMovimiento(dias) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('Dias', sql.Int, dias)
    .query(`
      SELECT v.ProductoId, v.Marca, v.Modelo, v.Anio, v.Precio, v.Vendedor,
             DATEDIFF(DAY, v.FechaPublicacion, SYSUTCDATETIME()) AS DiasPublicado,
             v.PrecioPromedioCategoria
      FROM dbo.vw_CatalogoVehiculos AS v
      WHERE v.Estado = 'DISPONIBLE'
        AND v.FechaPublicacion < DATEADD(DAY, -@Dias, SYSUTCDATETIME())
        AND NOT EXISTS (SELECT 1 FROM dbo.Transaccion AS t WHERE t.ProductoId = v.ProductoId)
      ORDER BY DiasPublicado DESC;
    `);
  return result.recordset;
}
