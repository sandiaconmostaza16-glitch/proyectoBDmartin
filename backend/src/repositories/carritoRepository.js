/*
 * Carrito: SQL explicito (sin SP) porque son operaciones de una sola tabla.
 * Las condiciones del WHERE impiden agregar vehiculos no disponibles o
 * propios, y el DELETE siempre filtra por usuario Y producto.
 */
import { getConnection, sql } from '../config/db.js';

export async function listar(usuarioId) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('UsuarioId', sql.Int, usuarioId)
    .query(`
      SELECT ci.ProductoId, ci.FechaAgregada,
             v.Marca, v.Modelo, v.Version, v.Anio, v.Kilometraje, v.Precio,
             v.Estado, v.ImagenPrincipal, v.Ciudad
      FROM dbo.CarritoItem AS ci
      INNER JOIN dbo.vw_CatalogoVehiculos AS v ON v.ProductoId = ci.ProductoId
      WHERE ci.UsuarioId = @UsuarioId
      ORDER BY ci.FechaAgregada DESC;
    `);
  return result.recordset;
}

/** Devuelve true si se agrego; false si no cumplia las condiciones. */
export async function agregar(usuarioId, productoId) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('UsuarioId', sql.Int, usuarioId)
    .input('ProductoId', sql.Int, productoId)
    .query(`
      INSERT INTO dbo.CarritoItem (UsuarioId, ProductoId)
      SELECT @UsuarioId, p.ProductoId
      FROM dbo.Producto AS p
      WHERE p.ProductoId = @ProductoId
        AND p.Estado = 'DISPONIBLE'
        AND p.UsuarioVendedorId <> @UsuarioId
        AND NOT EXISTS (SELECT 1 FROM dbo.CarritoItem AS c
                        WHERE c.UsuarioId = @UsuarioId AND c.ProductoId = @ProductoId);
    `);
  return result.rowsAffected[0] === 1;
}

/** Explica por que no se pudo agregar (para responder un error claro). */
export async function motivoNoAgregado(usuarioId, productoId) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('UsuarioId', sql.Int, usuarioId)
    .input('ProductoId', sql.Int, productoId)
    .query(`
      SELECT p.Estado,
             CAST(CASE WHEN p.UsuarioVendedorId = @UsuarioId THEN 1 ELSE 0 END AS BIT) AS EsPropio,
             CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.CarritoItem AS c
                                    WHERE c.UsuarioId = @UsuarioId AND c.ProductoId = p.ProductoId)
                       THEN 1 ELSE 0 END AS BIT) AS YaEnCarrito
      FROM dbo.Producto AS p
      WHERE p.ProductoId = @ProductoId;
    `);
  return result.recordset[0] ?? null;
}

export async function quitar(usuarioId, productoId) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('UsuarioId', sql.Int, usuarioId)
    .input('ProductoId', sql.Int, productoId)
    .query(`
      DELETE FROM dbo.CarritoItem
      WHERE UsuarioId = @UsuarioId
        AND ProductoId = @ProductoId;
    `);
  return result.rowsAffected[0];
}
