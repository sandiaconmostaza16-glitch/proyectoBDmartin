import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import catalogRoutes from './routes/catalogRoutes.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'proyecto-bd-backend' });
});

app.use('/api', catalogRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
