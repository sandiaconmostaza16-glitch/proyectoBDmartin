import * as carrito from '../repositories/carritoRepository.js';
import { HttpError, requiredId } from '../utils/validation.js';

export async function listar(req, res) {
  res.json(await carrito.listar(req.user.id));
}

export async function agregar(req, res) {
  const productoId = requiredId(req.body?.productoId, 'productoId');
  const agregado = await carrito.agregar(req.user.id, productoId);

  if (!agregado) {
    const motivo = await carrito.motivoNoAgregado(req.user.id, productoId);
    if (!motivo) throw new HttpError(404, 'El vehículo no existe.');
    if (motivo.EsPropio) throw new HttpError(409, 'No puedes agregar un vehículo que tú publicaste.');
    if (motivo.YaEnCarrito) throw new HttpError(409, 'El vehículo ya está en tu carrito.');
    throw new HttpError(409, `El vehículo no está disponible (estado: ${motivo.Estado}).`);
  }
  res.status(201).json(await carrito.listar(req.user.id));
}

export async function quitar(req, res) {
  const filas = await carrito.quitar(req.user.id, requiredId(req.params.productoId, 'productoId'));
  if (filas === 0) throw new HttpError(404, 'El vehículo no estaba en tu carrito.');
  res.json(await carrito.listar(req.user.id));
}
