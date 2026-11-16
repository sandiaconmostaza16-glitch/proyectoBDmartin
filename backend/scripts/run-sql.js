/*
 * Ejecuta uno o mas scripts .sql de /database y muestra los mensajes (PRINT)
 * y los resultados del ultimo lote.
 *
 * Uso:  node scripts/run-sql.js 05_pruebas.sql
 *       pnpm db:pruebas
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Uso: node scripts/run-sql.js <archivo.sql> [...]');
  process.exit(1);
}

const databaseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../database');

const pool = new sql.ConnectionPool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  // Con instancia con nombre (ej. SQLEXPRESS) se usa el SQL Browser en vez del puerto
  ...(process.env.DB_INSTANCE ? {} : { port: Number(process.env.DB_PORT || 1433) }),
  database: process.env.DB_DATABASE || 'RutaDB',
  pool: { max: 1, min: 1 },
  options: {
    instanceName: process.env.DB_INSTANCE || undefined,
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
  }
});

try {
  await pool.connect();
  for (const file of files) {
    const content = await readFile(path.join(databaseDir, path.basename(file)), 'utf8');
    const batches = content.split(/^\s*GO\s*$/gim).map((b) => b.trim()).filter(Boolean);

    for (const [index, batch] of batches.entries()) {
      const request = pool.request();
      request.on('info', (info) => console.log(info.message));
      const result = await request.batch(batch);
      if (index === batches.length - 1) {
        // Solo el resumen final (las ultimas 2 tablas) para no llenar la consola
        for (const recordset of result.recordsets.slice(-2)) console.table(recordset);
      }
    }
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exitCode = 1;
} finally {
  await pool.close();
}
