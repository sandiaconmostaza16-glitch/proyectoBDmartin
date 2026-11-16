/*
 * Conexion a SQL Server con el driver mssql (tedious).
 * El driver solo abre la conexion y envia el SQL con sus parametros:
 * todas las sentencias estan escritas a mano en /src/repositories.
 */
import sql from 'mssql';

const requiredVariables = ['DB_USER', 'DB_PASSWORD', 'DB_SERVER', 'DB_DATABASE'];
let poolPromise;

export function getConnection() {
  if (!poolPromise) {
    const missing = requiredVariables.filter((name) => !process.env[name]);
    if (missing.length > 0) {
      throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
    }

    poolPromise = new sql.ConnectionPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: process.env.DB_DATABASE,
      // Con instancia con nombre (ej. SQLEXPRESS) se usa el SQL Browser en vez del puerto
      ...(process.env.DB_INSTANCE ? {} : { port: Number(process.env.DB_PORT || 1433) }),
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
      options: {
        instanceName: process.env.DB_INSTANCE || undefined,
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
      }
    })
      .connect()
      .catch((error) => {
        // Si la conexion falla, el siguiente request vuelve a intentarlo.
        poolPromise = undefined;
        throw error;
      });
  }

  return poolPromise;
}

export async function closeConnection() {
  if (poolPromise) {
    const pool = await poolPromise;
    poolPromise = undefined;
    await pool.close();
  }
}

export { sql };
