import sql from 'mssql';

const requiredVariables = ['DB_USER', 'DB_PASSWORD', 'DB_SERVER', 'DB_DATABASE'];
let poolPromise;

export function getConnection() {
  if (!poolPromise) {
    const missing = requiredVariables.filter((name) => !process.env[name]);
    if (missing.length > 0) {
      throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
    }

    poolPromise = sql.connect({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: process.env.DB_DATABASE,
      port: Number(process.env.DB_PORT || 1433),
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
      }
    });
  }

  return poolPromise;
}

export { sql };
