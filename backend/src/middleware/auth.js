import { HttpError } from '../utils/validation.js';
import { readToken } from '../utils/security.js';

/** Exige header "Authorization: Bearer <token>" valido. Deja req.user = { id, rol }. */
export function requireAuth(req, _res, next) {
  const header = req.get('authorization') || '';
  const user = readToken(header.startsWith('Bearer ') ? header.slice(7) : null);
  if (!user) return next(new HttpError(401, 'Debes iniciar sesión.'));
  req.user = user;
  return next();
}

/** Exige uno de los roles indicados (usar despues de requireAuth). */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.rol)) {
      return next(new HttpError(403, 'No tienes permisos para esta operación.'));
    }
    return next();
  };
}
