import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { verifyInternalKey } from './middlewares/auth.middleware.js';
import orderRoutes from './routes/order.routes.js';

const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ service: 'service-order', status: 'OK' });
});

app.use('/api', verifyInternalKey, orderRoutes);

app.listen(PORT, () => {
  console.log(`[service-order] berjalan di http://localhost:${PORT}`);
});