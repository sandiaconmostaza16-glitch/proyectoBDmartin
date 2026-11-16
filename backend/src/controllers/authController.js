import * as usuarios from '../repositories/usuarioRepository.js';
import { createToken, hashPassword, verifyPassword } from '../utils/security.js';
import { HttpError, oneOf, optionalString, requiredString } from '../utils/validation.js';

function respuestaSesion(usuario) {
  return {
    token: createToken(usuario),
    usuario: {
      id: usuario.UsuarioId,
      nombre: usuario.Nombre,
      apellido: usuario.Apellido,
      email: usuario.Email,
      rol: usuario.Rol
    }
  };
}

export async function login(req, res) {
  const email = requiredString(req.body?.email, 'El correo', { max: 120 }).toLowerCase();
  const password = requiredString(req.body?.password, 'La contraseña', { max: 100 });

  const usuario = await usuarios.buscarPorEmail(email);
  // Mismo mensaje si no existe o si la clave no coincide: no revela que correos existen.
  if (!usuario || !verifyPassword(password, usuario.PasswordHash)) {
    throw new HttpError(401, 'Correo o contraseña incorrectos.');
  }
  if (!usuario.Estado) {
    throw new HttpError(403, 'La cuenta está desactivada. Contacta a soporte.');
  }
  res.json(respuestaSesion(usuario));
}

export async function registro(req, res) {
  const password = requiredString(req.body?.password, 'La contraseña', { min: 6, max: 100 });
  const nuevo = await usuarios.registrar({
    nombre: requiredString(req.body?.nombre, 'El nombre', { max: 60 }),
    apellido: requiredString(req.body?.apellido, 'El apellido', { max: 60 }),
    email: requiredString(req.body?.email, 'El correo', { max: 120 }).toLowerCase(),
    rut: optionalString(req.body?.rut, 'El RUT', { max: 12 }),
    telefono: optionalString(req.body?.telefono, 'El teléfono', { max: 20 }),
    rol: oneOf(req.body?.rol ?? 'CLIENTE', 'El rol', ['CLIENTE', 'VENDEDOR']),
    passwordHash: hashPassword(password)
  });
  res.status(201).json(respuestaSesion(nuevo));
}

export async function perfil(req, res) {
  const usuario = await usuarios.buscarPorId(req.user.id);
  if (!usuario || !usuario.Estado) throw new HttpError(401, 'La sesión ya no es válida.');
  res.json({
    id: usuario.UsuarioId,
    nombre: usuario.Nombre,
    apellido: usuario.Apellido,
    email: usuario.Email,
    rol: usuario.Rol,
    direccion: usuario.Direccion
  });
}
