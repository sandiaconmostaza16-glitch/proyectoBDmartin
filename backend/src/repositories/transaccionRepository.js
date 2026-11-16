/*
 * Transacciones de compra: crear, pagar, cancelar y asignar asesor (SP),
 * y consultas de seguimiento sobre vw_TransaccionesDetalle.
 */
import { getConnection, sql } from '../config/db.js';

export async function crear({ compradorId, productoId, planId, direccionEntrega, ubicacionDestinoId }) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('CompradorId', sql.Int, compradorId)
    .input('ProductoId', sql.Int, productoId)
    .input('PlanId', sql.Int, planId)
    .input('DireccionEntrega', sql.NVarChar(250), direccionEntrega)
    .input('UbicacionDestinoId', sql.Int, ubicacionDestinoId)
    .execute('dbo.sp_CrearTransaccion');
  return result.recordset[0];
}

/** Compras y ventas del usuario (como comprador o como vendedor). */
export async function listarDelUsuario(usuarioId) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('UsuarioId', sql.Int, usuarioId)
    .query(`
      SELECT *,
             CASE WHEN UsuarioCompradorId = @UsuarioId THEN 'COMPRA' ELSE 'VENTA' END AS Rol
      FROM dbo.vw_TransaccionesDetalle
      WHERE UsuarioCompradorId = @UsuarioId
         OR UsuarioVendedorId = @UsuarioId
      ORDER BY Fecha DESC;
    `);
  return result.recordset;
}

/** Detalle de una transaccion solo si el usuario participa en ella. */
export async function obtenerParaUsuario(transaccionId, usuarioId, esStaff) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('TransaccionId', sql.Int, transaccionId)
    .input('UsuarioId', sql.Int, usuarioId)
    .input('EsStaff', sql.Bit, esStaff)
    .query(`
      SELECT *
      FROM dbo.vw_TransaccionesDetalle
      WHERE TransaccionId = @TransaccionId
        AND (@EsStaff = 1
             OR UsuarioCompradorId = @UsuarioId
             OR UsuarioVendedorId = @UsuarioId
             OR AsesorUsuarioId = @UsuarioId);

      SELECT PagoId, OrdenCompra, Monto, TipoPago, EstadoPago, CodigoAutorizacion, FechaCreacion
      FROM dbo.Pago
      WHERE TransaccionId = @TransaccionId
      ORDER BY FechaCreacion DESC, PagoId DESC;
    `);
  const [[transaccion], pagos] = result.recordsets;
  return transaccion ? { ...transaccion, pagos } : null;
}

export async function registrarPago({ transaccionId, compradorId, tipoPago, resultado, codigoAutorizacion, token }) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('TransaccionId', sql.Int, transaccionId)
    .input('CompradorId', sql.Int, compradorId)
    .input('TipoPago', sql.NVarChar(30), tipoPago)
    .input('ResultadoPasarela', sql.NVarChar(15), resultado)
    .input('CodigoAutorizacion', sql.NVarChar(30), codigoAutorizacion)
    .input('TokenTransbank', sql.NVarChar(500), token)
    .execute('dbo.sp_RegistrarPago');
  return result.recordset[0];
}

export async function cancelar(transaccionId, usuarioId) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('TransaccionId', sql.Int, transaccionId)
    .input('UsuarioId', sql.Int, usuarioId)
    .execute('dbo.sp_CancelarTransaccion');
  return result.recordset[0];
}

export async function asignarAsesor(transaccionId, asesorId) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('TransaccionId', sql.Int, transaccionId)
    .input('AsesorId', sql.Int, asesorId)
    .execute('dbo.sp_AsignarAsesor');
  return result.recordset[0];
}

/** Bandeja del asesor: pendientes, las mas antiguas primero (riesgo de vencer). */
export async function listarPendientes() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT TransaccionId, Fecha, HorasDesdeCreacion, Monto, Comprador, EmailComprador,
           Vendedor, Asesor, AsesorUsuarioId, Marca, Modelo, Anio, Patente,
           PlanNombre, IntentosPago, UltimoEstadoPago,
           CAST(CASE WHEN HorasDesdeCreacion >= 72 THEN 1 ELSE 0 END AS BIT) AS PorVencer
    FROM dbo.vw_TransaccionesDetalle
    WHERE Estado = 'PENDIENTE'
    ORDER BY Fecha ASC;
  `);
  return result.recordset;
}
