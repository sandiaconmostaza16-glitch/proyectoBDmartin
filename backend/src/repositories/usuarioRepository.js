import { getConnection, sql } from '../config/db.js';

/** Trae el hash para verificar la contrasena en la API (nunca se compara en SQL). */
export async function buscarPorEmail(email) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('Email', sql.NVarChar(120), email)
    .query(`
      SELECT UsuarioId, Nombre, Apellido, Email, Rol, Estado, PasswordHash
      FROM dbo.Usuario
      WHERE Email = @Email;
    `);
  return result.recordset[0] ?? null;
}

export async function buscarPorId(usuarioId) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('UsuarioId', sql.Int, usuarioId)
    .query(`
      SELECT UsuarioId, Nombre, Apellido, Email, Rol, Estado, Telefono, Direccion
      FROM dbo.Usuario
      WHERE UsuarioId = @UsuarioId;
    `);
  return result.recordset[0] ?? null;
}

export async function registrar(datos) {
  const pool = await getConnection();
  const result = await pool.request()
    .input('Nombre', sql.NVarChar(60), datos.nombre)
    .input('Apellido', sql.NVarChar(60), datos.apellido)
    .input('Email', sql.NVarChar(120), datos.email)
    .input('PasswordHash', sql.NVarChar(255), datos.passwordHash)
    .input('Rut', sql.NVarChar(12), datos.rut)
    .input('Telefono', sql.NVarChar(20), datos.telefono)
    .input('Rol', sql.NVarChar(20), datos.rol)
    .execute('dbo.sp_RegistrarUsuario');
  return result.recordset[0];
}
