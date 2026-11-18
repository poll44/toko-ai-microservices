import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { verifyInternalKey } from './middlewares/auth.middleware.js';
import catalogRoutes from './routes/catalog.routes.js';

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// Health check publik
app.get('/health', (_req, res) => {
  res.json({ service: 'service-catalog', status: 'OK' });
});

// Semua endpoint /api dilindungi Internal API Key
app.use('/api', verifyInternalKey, catalogRoutes);

app.listen(PORT, () => {
  console.log(`[service-catalog] berjalan di http://localhost:${PORT}`);
});