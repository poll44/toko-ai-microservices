import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createProxyMiddleware } from 'http-proxy-middleware';
import authDb from './db/auth.db.js';
import { extractUserFromJwt } from './middlewares/jwt.middleware.js';

const app = express();
const PORT = process.env.PORT || 8080;
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';

app.use(cors());

// Helper konfigurasi proxy agar otomatis menyuntikkan header internal & role
const buildProxy = (
  target: string,
  pathRewrite?: Record<string, string>,
  opts: { stripBrowserOrigin?: boolean } = {}
) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    on: {
      proxyReq: (proxyReq, req) => {
        // CORS untuk browser sudah ditangani gateway (app.use(cors())). Upstream seperti
        // ADK api_server punya origin guard sendiri yang menolak POST dari origin asing
        // ("Forbidden: origin not allowed"), jadi hop gateway -> upstream dibuat server-to-server.
        if (opts.stripBrowserOrigin) proxyReq.removeHeader('origin');
        proxyReq.setHeader('x-internal-api-key', INTERNAL_KEY);
        proxyReq.setHeader('x-user-id', (req.headers['x-user-id'] as string) || '');
        proxyReq.setHeader('x-user-role', (req.headers['x-user-role'] as string) || 'GUEST');
      },
    },
  });

// 1. Health Check Gateway
app.get('/health', (_req, res) => {
  res.json({ service: 'service-gateway', status: 'OK' });
});

// 2. Endpoint Autentikasi (Menggunakan express.json() lokal)
app.post('/auth/login', express.json(), (req, res) => {
  const { email, password } = req.body;
  const user = authDb
    .prepare('SELECT id, email, name, role FROM users WHERE email = ? AND password = ?')
    .get(email, password) as any;

  if (!user) {
    res.status(401).json({ error: 'Email atau password salah' });
    return;
  }

  const token = jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: '24h' });
  res.json({ message: 'Login berhasil', token, user });
});

// Daftar akun demo untuk tombol Quick Role Switcher di Frontend nanti
app.get('/auth/demo-users', (_req, res) => {
  const users = authDb.prepare('SELECT id, email, name, role FROM users').all();
  res.json({ data: users });
});

// 3. Routing Proxy ke Domain Services (Dilindungi JWT Extractor)
// /api/catalog/products -> http://localhost:4001/api/products
app.use(
  '/api/catalog',
  extractUserFromJwt,
  buildProxy(process.env.CATALOG_SERVICE_URL!, { '^/': '/api/' })
);

// /api/orders -> http://localhost:4002/api/orders
app.use(
  '/api/orders',
  extractUserFromJwt,
  buildProxy(process.env.ORDER_SERVICE_URL!, { '^/': '/api/orders/' })
);

// /api/tickets -> http://localhost:4003/api/tickets
app.use(
  '/api/tickets',
  extractUserFromJwt,
  buildProxy(process.env.TICKET_SERVICE_URL!, { '^/': '/api/tickets/' })
);

// /api/agent -> http://localhost:8000 (Untuk jalur AI Agent dari Frontend)
app.use(
  '/api/agent',
  extractUserFromJwt,
  buildProxy(process.env.AGENT_SERVICE_URL!, { '^/': '/' }, { stripBrowserOrigin: true })
);

app.listen(PORT, () => {
  console.log(`[service-gateway] berjalan di http://localhost:${PORT}`);
});