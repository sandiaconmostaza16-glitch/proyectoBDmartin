import * as reportes from '../repositories/reporteRepository.js';
import { optionalInt } from '../utils/validation.js';

export async function panel(req, res) {
  const dias = optionalInt(req.query.diasSinMovimiento, 'diasSinMovimiento', { min: 1, max: 365 }) ?? 14;
  const [resumen, ventasPorMarca, demandaPorCategoria, sinMovimiento] = await Promise.all([
    reportes.resumen(),
    reportes.ventasPorMarca(),
    reportes.demandaPorCategoria(),
    reportes.publicacionesSinMovimiento(dias)
  ]);
  res.json({ resumen, ventasPorMarca, demandaPorCategoria, sinMovimiento, diasSinMovimiento: dias });
}
