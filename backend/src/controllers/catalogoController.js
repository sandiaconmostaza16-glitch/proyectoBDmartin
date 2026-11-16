import * as catalogo from '../repositories/catalogoRepository.js';
import { HttpError, oneOf, optionalInt, optionalNumber, optionalString, requiredId } from '../utils/validation.js';

export async function filtros(_req, res) {
  res.json(await catalogo.obtenerFiltros());
}

export async function buscar(req, res) {
  const q = req.query;
  const resultado = await catalogo.buscarVehiculos({
    texto: optionalString(q.q, 'La búsqueda', { max: 60 }),
    marcaId: optionalInt(q.marcaId, 'marcaId', { min: 1 }),
    categoriaId: optionalInt(q.categoriaId, 'categoriaId', { min: 1 }),
    ubicacionId: optionalInt(q.ubicacionId, 'ubicacionId', { min: 1 }),
    precioMin: optionalNumber(q.precioMin, 'precioMin'),
    precioMax: optionalNumber(q.precioMax, 'precioMax'),
    anioMin: optionalInt(q.anioMin, 'anioMin', { min: 1900, max: 2100 }),
    anioMax: optionalInt(q.anioMax, 'anioMax', { min: 1900, max: 2100 }),
    transmision: oneOf(q.transmision, 'transmision', ['MANUAL', 'AUTOMATICA', 'CVT', 'OTRA'], { optional: true }),
    orden: oneOf(q.orden || 'recientes', 'orden', ['recientes', 'precio_asc', 'precio_desc', 'anio', 'km']),
    pagina: optionalInt(q.pagina, 'pagina', { min: 1 }) ?? 1,
    tamanoPagina: optionalInt(q.tamanoPagina, 'tamanoPagina', { min: 1, max: 50 }) ?? 12
  });
  res.json(resultado);
}

export async function detalle(req, res) {
  const vehiculo = await catalogo.obtenerDetalle(requiredId(req.params.id, 'El id del vehículo'));
  if (!vehiculo) throw new HttpError(404, 'El vehículo no existe.');
  res.json(vehiculo);
}

export async function planes(_req, res) {
  res.json(await catalogo.listarPlanes());
}
