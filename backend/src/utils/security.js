/*
 * Hash de contrasenas (scrypt) y tokens de sesion firmados (HMAC-SHA256).
 * Solo usa el modulo crypto de Node, sin dependencias extra.
 */
import crypto from 'node:crypto';

const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 horas

function secret() {
  return process.env.AUTH_SECRET || 'dev-secret-cambiar-en-produccion';
}

/** Devuelve "scrypt$<salt>$<hash>" para guardar en Usuario.PasswordHash. */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/** Compara en tiempo constante para no filtrar informacion por timing. */
export function verifyPassword(password, stored) {
  const [algorithm, saltHex, hashHex] = String(stored).split('$');
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function sign(data) {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url');
}

export function createToken(user) {
  const payload = Buffer.from(JSON.stringify({
    id: user.UsuarioId,
    rol: user.Rol,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** Devuelve { id, rol } si el token es valido y no expiro; si no, null. */
export function readToken(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (expected.length !== signature.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: data.id, rol: data.rol };
  } catch {
    return null;
  }
}
