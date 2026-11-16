/*
 * Validacion de entradas en la API (primera barrera).
 * La segunda barrera son las validaciones de los procedimientos almacenados
 * y la tercera las restricciones (CHECK, FK, UNIQUE) de las tablas.
 */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message) => new HttpError(400, message);

/** Entero positivo obligatorio (ids de ruta o body). */
export function requiredId(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw badRequest(`${field} debe ser un entero positivo.`);
  }
  return number;
}

/** Entero opcional: devuelve null si viene vacio. */
export function optionalInt(value, field, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw badRequest(`${field} debe ser un entero entre ${min} y ${max}.`);
  }
  return number;
}

/** Numero opcional (montos). */
export function optionalNumber(value, field, { min = 0 } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) {
    throw badRequest(`${field} debe ser un número mayor o igual a ${min}.`);
  }
  return number;
}

/** Texto obligatorio con largo maximo. */
export function requiredString(value, field, { max = 200, min = 1 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min) {
    throw badRequest(`${field} es obligatorio${min > 1 ? ` (mínimo ${min} caracteres)` : ''}.`);
  }
  const text = value.trim();
  if (text.length > max) throw badRequest(`${field} admite como máximo ${max} caracteres.`);
  return text;
}

/** Texto opcional con largo maximo. */
export function optionalString(value, field, { max = 200 } = {}) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw badRequest(`${field} debe ser texto.`);
  const text = value.trim();
  if (text.length > max) throw badRequest(`${field} admite como máximo ${max} caracteres.`);
  return text || null;
}

/** Valor dentro de una lista cerrada. */
export function oneOf(value, field, allowed, { optional = false } = {}) {
  if ((value === undefined || value === null || value === '') && optional) return null;
  if (!allowed.includes(value)) {
    throw badRequest(`${field} debe ser uno de: ${allowed.join(', ')}.`);
  }
  return value;
}
