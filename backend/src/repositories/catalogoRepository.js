/*
 * Catalogo: filtros, busqueda (SP), detalle de vehiculo y planes.
 */
import { getConnection, sql } from '../config/db.js';

/** Datos para armar los filtros: categorias y marcas con conteo, ubicaciones y rangos. */
export async function obtenerFiltros() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    -- Categorias con la cantidad de vehiculos disponibles (incluye las que tienen 0)
    SELECT c.CategoriaId, c.Nombre, COUNT(p.ProductoId) AS Disponibles
    FROM dbo.Categoria AS c
    LEFT JOIN dbo.Producto AS p
           ON p.CategoriaId = c.CategoriaId AND p.Estado = 'DISPONIBLE'
    GROUP BY c.CategoriaId, c.Nombre
    ORDER BY c.Nombre;

    -- Marcas con al menos un vehiculo disponible
    SELECT m.MarcaId, m.Nombre, COUNT(*) AS Disponibles
    FROM dbo.Marca AS m
    INNER JOIN dbo.Producto AS p ON p.MarcaId = m.MarcaId
    WHERE p.Estado = 'DISPONIBLE'
    GROUP BY m.MarcaId, m.Nombre
    HAVING COUNT(*) > 0
    ORDER BY m.Nombre;

    SELECT UbicacionId, Ciudad, Provincia
    FROM dbo.Ubicacion
    ORDER BY Provincia, Ciudad;

    -- Rangos para los filtros de precio y anio
    SELECT MIN(Precio) AS PrecioMin, MAX(Precio) AS PrecioMax,
           MIN(Anio) AS AnioMin, MAX(Anio) AS AnioMax,
           COUNT(*) AS TotalDisponibles
    FROM dbo.Producto
    WHERE Estado = 'DISPONIBLE';

    -- Marcas completas (para el formulario de publicacion)
    SELECT MarcaId, Nombre FROM dbo.Marca ORDER BY Nombre;
  `);

  const [categorias, marcas, ubicaciones, [rangos], todasLasMarcas] = result.recordsets;
  return { categorias, marcas, ubicaciones, rangos, todasLasMarcas };
}

/** Busqueda paginada: delega en sp_BuscarVehiculos. */
export async function buscarVehiculos(filtros) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('Texto', sql.NVarChar(60), filtros.texto)
    .input('MarcaId', sql.Int, filtros.marcaId)
    .input('CategoriaId', sql.Int, filtros.categoriaId)
    .input('UbicacionId', sql.Int, filtros.ubicacionId)
    .input('PrecioMin', sql.Decimal(14, 2), filtros.precioMin)
    .input('PrecioMax', sql.Decimal(14, 2), filtros.precioMax)
    .input('AnioMin', sql.SmallInt, filtros.anioMin)
    .input('AnioMax', sql.SmallInt, filtros.anioMax)
    .input('Transmision', sql.NVarChar(15), filtros.transmision)
    .input('Orden', sql.VarChar(20), filtros.orden)
    .input('Pagina', sql.Int, filtros.pagina)
    .input('TamanoPagina', sql.Int, filtros.tamanoPagina)
    .execute('dbo.sp_BuscarVehiculos');

  const filas = result.recordset;
  return {
    total: filas[0]?.TotalResultados ?? 0,
    pagina: filtros.pagina,
    tamanoPagina: filtros.tamanoPagina,
    vehiculos: filas.map(({ TotalResultados, ...vehiculo }) => vehiculo)
  };
}

/** Detalle de un vehiculo con imagenes, revisiones, historial de precio y cuotas por plan. */
export async function obtenerDetalle(productoId) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('ProductoId', sql.Int, productoId)
    .query(`
      SELECT v.*, info.MotivoVenta, info.Mantenciones
      FROM dbo.vw_CatalogoVehiculos AS v
      LEFT JOIN dbo.auto_info_vendedor AS info ON info.ProductoId = v.ProductoId
      WHERE v.ProductoId = @ProductoId;

      SELECT ImagenId, UrlImagen, EsPrincipal, Orden
      FROM dbo.Imagen
      WHERE ProductoId = @ProductoId
      ORDER BY EsPrincipal DESC, Orden;

      SELECT TOP (5) RevisionId, TieneChoques, DetalleDanos, PapelesAlDia,
             RevisionTecnicaOk, Observaciones, FechaRevision
      FROM dbo.auto_revision
      WHERE ProductoId = @ProductoId
      ORDER BY FechaRevision DESC;

      SELECT HistorialId, PrecioAnterior, PrecioNuevo, FechaCambio
      FROM dbo.HistorialPrecio
      WHERE ProductoId = @ProductoId
      ORDER BY FechaCambio DESC;

      -- Simulacion de cuotas del vehiculo en cada plan vigente
      SELECT pf.PlanId, pf.Nombre, pf.CantidadCuotas, pf.TasaMensual,
             dbo.fn_CuotaMensual(p.Precio, pf.CantidadCuotas, pf.TasaMensual) AS Cuota,
             dbo.fn_CuotaMensual(p.Precio, pf.CantidadCuotas, pf.TasaMensual) * pf.CantidadCuotas AS TotalFinanciado
      FROM dbo.PlanFinanciacion AS pf
      CROSS JOIN dbo.Producto AS p
      WHERE p.ProductoId = @ProductoId
        AND pf.Activo = 1
      ORDER BY pf.CantidadCuotas;
    `);

  const [[vehiculo], imagenes, revisiones, historialPrecios, planes] = result.recordsets;
  if (!vehiculo) return null;
  return { ...vehiculo, imagenes, revisiones, historialPrecios, planes };
}

export async function listarPlanes() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT PlanId, Nombre, CantidadCuotas, TasaMensual
    FROM dbo.PlanFinanciacion
    WHERE Activo = 1
    ORDER BY CantidadCuotas;
  `);
  return result.recordset;
}
