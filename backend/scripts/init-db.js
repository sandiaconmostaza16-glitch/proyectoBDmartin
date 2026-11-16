/*
 * Crea la base RutaDB desde cero ejecutando los scripts de /database en orden:
 *   00_create_database -> 01_schema -> 02_views -> 03_stored_procedures -> 04_seed
 *
 * Uso:  pnpm db:init        (desde /backend, con el .env configurado)
 *
 * Los scripts se separan en lotes por la palabra GO, igual que SSMS o sqlcmd.
 * Se usa un pool de una sola conexion para que el "USE RutaDB" de un lote
 * siga vigente en los lotes siguientes.
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sql from 'mssql';

const scripts = [
  '00_create_database.sql',
  '01_schema.sql',
  '02_views.sql',
  '03_stored_procedures.sql',
  '04_seed.sql'
];

const databaseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../database');

export async function initDatabase({ quiet = false } = {}) {
  const pool = new sql.ConnectionPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    // Con instancia con nombre (ej. SQLEXPRESS) se usa el SQL Browser en vez del puerto
    ...(process.env.DB_INSTANCE ? {} : { port: Number(process.env.DB_PORT || 1433) }),
    database: 'master',
    pool: { max: 1, min: 1 },
    options: {
      instanceName: process.env.DB_INSTANCE || undefined,
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
    }
  });

  try {
    await pool.connect();
    for (const file of scripts) {
      const content = await readFile(path.join(databaseDir, file), 'utf8');
      const batches = content
        .split(/^\s*GO\s*$/gim)
        .map((batch) => batch.trim())
        .filter(Boolean);

      for (const batch of batches) {
        await pool.request().batch(batch);
      }
      if (!quiet) console.log(`OK  ${file} (${batches.length} lotes)`);
    }
    if (!quiet) console.log('Base de datos RutaDB lista.');
  } finally {
    await pool.close();
  }
}

// Ejecutado directamente (node scripts/init-db.js), no importado.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  initDatabase().catch((error) => {
    console.error('Error inicializando la base de datos:', error.message);
    process.exitCode = 1;
  });
}
