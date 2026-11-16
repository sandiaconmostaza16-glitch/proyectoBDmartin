import * as vendedor from '../repositories/vendedorRepository.js';
import {
  oneOf, optionalInt, optionalString, requiredId, requiredString, badRequest
} from '../utils/validation.js';

export async function misVehiculos(req, res) {
  res.json(await vendedor.listarMisVehiculos(req.user.id));
}

export async function publicar(req, res) {
  const b = req.body ?? {};
  const precio = Number(b.precio);
  if (!Number.isFinite(precio) || precio <= 0) throw badRequest('El precio debe ser un número mayor a 0.');

  const urlImagen = optionalString(b.urlImagen, 'La URL de la imagen', { max: 500 });
  if (urlImagen && !/^https:\/\/\S+$/i.test(urlImagen)) {
    throw badRequest('La URL de la imagen debe comenzar con https://');
  }

  const vehiculo = await vendedor.publicar(req.user.id, {
    marcaId: requiredId(b.marcaId, 'La marca'),
    categoriaId: requiredId(b.categoriaId, 'La categoría'),
    ubicacionId: requiredId(b.ubicacionId, 'La ubicación'),
    modelo: requiredString(b.modelo, 'El modelo', { max: 60 }),
    version: optionalString(b.version, 'La versión', { max: 60 }),
    combustible: requiredString(b.combustible, 'El combustible', { max: 30 }),
    anio: optionalInt(b.anio, 'El año', { min: 1900, max: 2100 }),
    patente: requiredString(b.patente, 'La patente', { max: 10 }),
    vin: optionalString(b.vin, 'El VIN', { max: 17 }),
    color: optionalString(b.color, 'El color', { max: 30 }),
    kilometraje: optionalInt(b.kilometraje, 'El kilometraje', { min: 0 }),
    transmision: oneOf(b.transmision, 'La transmisión', ['MANUAL', 'AUTOMATICA', 'CVT', 'OTRA']),
    precio,
    descripcion: optionalString(b.descripcion, 'La descripción', { max: 2000 }),
    urlImagen,
    motivoVenta: optionalString(b.motivoVenta, 'El motivo de venta', { max: 500 }),
    duenosAnteriores: optionalInt(b.duenosAnteriores, 'Los dueños anteriores', { min: 0, max: 20 })
  });
  res.status(201).json(vehiculo);
}

export async function actualizarPrecio(req, res) {
  const precio = Number(req.body?.precio);
  if (!Number.isFinite(precio) || precio <= 0) throw badRequest('El precio debe ser un número mayor a 0.');
  res.json(await vendedor.actualizarPrecio(requiredId(req.params.id, 'El id del vehículo'), req.user.id, precio));
}

export async function cambiarEstado(req, res) {
  const estado = oneOf(req.body?.estado, 'El estado', ['DISPONIBLE', 'PAUSADO']);
  res.json(await vendedor.cambiarEstado(requiredId(req.params.id, 'El id del vehículo'), req.user.id, estado));
}
