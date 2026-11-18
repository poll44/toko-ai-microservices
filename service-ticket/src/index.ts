import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { verifyInternalKey } from './middlewares/auth.middleware.js';
import ticketRoutes from './routes/ticket.routes.js';

const app = express();
const PORT = process.env.PORT || 4003;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ service: 'service-ticket', status: 'OK' });
});

app.use('/api', verifyInternalKey, ticketRoutes);

app.listen(PORT, () => {
  console.log(`[service-ticket] berjalan di http://localhost:${PORT}`);
});