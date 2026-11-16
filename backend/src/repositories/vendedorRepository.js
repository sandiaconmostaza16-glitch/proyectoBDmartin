/*
 * Gestion de publicaciones del vendedor.
 */
import { getConnection, sql } from '../config/db.js';

/**
 * Vehiculos del vendedor con indicadores de interes:
 * cuantas personas lo tienen en el carrito, cuantas veces cambio de precio
 * y cuantas transacciones tuvo. Subconsultas agregadas + LEFT JOIN.
 */
export async function listarMisVehiculos(vendedorId) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('VendedorId', sql.Int, vendedorId)
    .query(`
      SELECT v.ProductoId, v.Marca, v.Modelo, v.Version, v.Anio, v.Patente,
             v.Kilometraje, v.Precio, v.Estado, v.FechaPublicacion, v.ImagenPrincipal,
             v.BajoDePrecio, v.PrecioPromedioCategoria,
             DATEDIFF(DAY, v.FechaPublicacion, SYSUTCDATETIME()) AS DiasPublicado,
             ISNULL(car.EnCarritos, 0)      AS EnCarritos,
             ISNULL(hp.CambiosPrecio, 0)    AS CambiosPrecio,
             ISNULL(tr.Transacciones, 0)    AS Transacciones
      FROM dbo.vw_CatalogoVehiculos AS v
      LEFT JOIN (SELECT ProductoId, COUNT(*) AS EnCarritos
                 FROM dbo.CarritoItem GROUP BY ProductoId) AS car
             ON car.ProductoId = v.ProductoId
      LEFT JOIN (SELECT ProductoId, COUNT(*) AS CambiosPrecio
                 FROM dbo.HistorialPrecio GROUP BY ProductoId) AS hp
             ON hp.ProductoId = v.ProductoId
      LEFT JOIN (SELECT ProductoId, COUNT(*) AS Transacciones
                 FROM dbo.Transaccion GROUP BY ProductoId) AS tr
             ON tr.ProductoId = v.ProductoId
      WHERE v.UsuarioVendedorId = @VendedorId
      ORDER BY CASE v.Estado WHEN 'DISPONIBLE' THEN 1 WHEN 'RESERVADO' THEN 2
                             WHEN 'PAUSADO' THEN 3 ELSE 4 END,
               v.FechaPublicacion DESC;
    `);
  return result.recordset;
}

export async function publicar(vendedorId, d) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('VendedorId', sql.Int, vendedorId)
    .input('MarcaId', sql.Int, d.marcaId)
    .input('CategoriaId', sql.Int, d.categoriaId)
    .input('UbicacionId', sql.Int, d.ubicacionId)
    .input('Modelo', sql.NVarChar(60), d.modelo)
    .input('Version', sql.NVarChar(60), d.version)
    .input('Combustible', sql.NVarChar(30), d.combustible)
    .input('Anio', sql.SmallInt, d.anio)
    .input('Patente', sql.NVarChar(10), d.patente)
    .input('Vin', sql.NVarChar(17), d.vin)
    .input('Color', sql.NVarChar(30), d.color)
    .input('Kilometraje', sql.Int, d.kilometraje)
    .input('Transmision', sql.NVarChar(15), d.transmision)
    .input('Precio', sql.Decimal(14, 2), d.precio)
    .input('Descripcion', sql.NVarChar(2000), d.descripcion)
    .input('UrlImagen', sql.NVarChar(500), d.urlImagen)
    .input('MotivoVenta', sql.NVarChar(500), d.motivoVenta)
    .input('DuenosAnteriores', sql.SmallInt, d.duenosAnteriores)
    .execute('dbo.sp_PublicarVehiculo');
  return result.recordset[0];
}

export async function actualizarPrecio(productoId, usuarioId, precioNuevo) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('ProductoId', sql.Int, productoId)
    .input('UsuarioId', sql.Int, usuarioId)
    .input('PrecioNuevo', sql.Decimal(14, 2), precioNuevo)
    .execute('dbo.sp_ActualizarPrecioVehiculo');
  return result.recordset[0];
}

export async function cambiarEstado(productoId, usuarioId, estadoNuevo) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('ProductoId', sql.Int, productoId)
    .input('UsuarioId', sql.Int, usuarioId)
    .input('EstadoNuevo', sql.NVarChar(15), estadoNuevo)
    .execute('dbo.sp_CambiarEstadoVehiculo');
  return result.recordset[0];
}
