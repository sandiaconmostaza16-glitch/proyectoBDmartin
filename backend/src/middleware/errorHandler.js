/*
 * Traduce errores a respuestas HTTP coherentes.
 *
 * Errores lanzados por los procedimientos almacenados (THROW 5xxxx):
 *   51xxx -> 400   52xxx -> 403   53xxx -> 404   54xxx -> 409
 * Errores del motor:
 *   2627 / 2601 (UNIQUE)      -> 409
 *   547 (FOREIGN KEY / CHECK) -> 400
 *   sin conexion              -> 503
 * Cualquier otro error se registra en consola y se responde 500 sin
 * exponer detalles internos.
 */
const businessStatus = { 1: 400, 2: 403, 3: 404, 4: 409 };

export function notFound(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, _req, res, _next) {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la solicitud no es JSON válido.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El cuerpo de la solicitud es demasiado grande.' });
  }
  if (error.status && error.status < 500) {
    return res.status(error.status).json({ error: error.message });
  }

  const number = error.number ?? error.originalError?.info?.number;

  if (number >= 51000 && number < 55000) {
    const status = businessStatus[Math.floor(number / 1000) - 50] ?? 400;
    return res.status(status).json({ error: error.message, code: number });
  }
  if (number === 2627 || number === 2601) {
    return res.status(409).json({ error: 'El registro ya existe (dato duplicado).', code: number });
  }
  if (number === 547) {
    return res.status(400).json({ error: 'La operación viola una restricción de integridad.', code: number });
  }
  if (['ESOCKET', 'ELOGIN', 'ETIMEOUT', 'ECONNCLOSED'].includes(error.code)) {
    console.error('[db]', error.code, error.message);
    return res.status(503).json({ error: 'La base de datos no está disponible.' });
  }

  console.error(error);
  return res.status(500).json({ error: 'Error interno del servidor.' });
}
