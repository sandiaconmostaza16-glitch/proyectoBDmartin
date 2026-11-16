/*
 * Aplicacion Express (sin levantar el servidor: eso lo hace server.js).
 * Separarlo permite que las pruebas levanten la API en un puerto libre.
 */
import cors from 'cors';
import express from 'express';
import { getConnection } from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', async (_req, res) => {
  const pool = await getConnection();
  const result = await pool.request().query('SELECT DB_NAME() AS baseDatos, SYSUTCDATETIME() AS horaServidor;');
  res.json({ status: 'ok', ...result.recordset[0] });
});

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;
