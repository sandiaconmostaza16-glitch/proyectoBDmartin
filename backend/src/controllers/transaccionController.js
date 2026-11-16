import crypto from 'node:crypto';
import * as transacciones from '../repositories/transaccionRepository.js';
import { HttpError, oneOf, optionalInt, requiredId, requiredString } from '../utils/validation.js';

export async function crear(req, res) {
  const transaccion = await transacciones.crear({
    compradorId: req.user.id,
    productoId: requiredId(req.body?.productoId, 'productoId'),
    planId: optionalInt(req.body?.planId, 'planId', { min: 1 }),
    direccionEntrega: requiredString(req.body?.direccionEntrega, 'La dirección de entrega', { min: 5, max: 250 }),
    ubicacionDestinoId: optionalInt(req.body?.ubicacionDestinoId, 'ubicacionDestinoId', { min: 1 })
  });
  res.status(201).json(transaccion);
}

export async function misTransacciones(req, res) {
  res.json(await transacciones.listarDelUsuario(req.user.id));
}

export async function detalle(req, res) {
  const esStaff = ['ADMIN', 'ASESOR'].includes(req.user.rol);
  const transaccion = await transacciones.obtenerParaUsuario(
    requiredId(req.params.id, 'El id de la transacción'), req.user.id, esStaff);
  if (!transaccion) throw new HttpError(404, 'La transacción no existe o no participas en ella.');
  res.json(transaccion);
}

/*
 * Pasarela de pago SIMULADA.
 * En produccion aqui se llamaria a Transbank Webpay y su respuesta
 * (autorizado / rechazado, codigo y token) se registraria con sp_RegistrarPago.
 * Para la demo, "simularRechazo: true" permite probar el camino de error.
 */
export async function pagar(req, res) {
  const autorizado = req.body?.simularRechazo !== true;
  const pago = await transacciones.registrarPago({
    transaccionId: requiredId(req.params.id, 'El id de la transacción'),
    compradorId: req.user.id,
    tipoPago: oneOf(req.body?.tipoPago, 'tipoPago', ['DEBITO', 'CREDITO', 'TRANSFERENCIA']),
    resultado: autorizado ? 'AUTORIZADO' : 'RECHAZADO',
    codigoAutorizacion: autorizado ? String(crypto.randomInt(100000, 999999)) : null,
    token: `SIM-${crypto.randomUUID()}`
  });
  res.status(201).json(pago);
}

export async function cancelar(req, res) {
  res.json(await transacciones.cancelar(requiredId(req.params.id, 'El id de la transacción'), req.user.id));
}

export async function tomarComoAsesor(req, res) {
  res.json(await transacciones.asignarAsesor(requiredId(req.params.id, 'El id de la transacción'), req.user.id));
}

export async function pendientes(_req, res) {
  res.json(await transacciones.listarPendientes());
}
