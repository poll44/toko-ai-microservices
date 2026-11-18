import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { registerAllTools } from './tools/registerTools.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());

const transports = new Map<string, SSEServerTransport>();

app.get('/health', (_req, res) => {
  res.json({ service: 'service-mcp', status: 'OK', activeSessions: transports.size });
});

app.get('/sse', async (req, res) => {
  console.log('[service-mcp] Koneksi SSE baru masuk dari:', req.ip);
  const mcpServer = new McpServer({
    name: 'toko-microservices-mcp',
    version: '1.0.0',
  });
  registerAllTools(mcpServer);

  const transport = new SSEServerTransport('/messages', res);
  transports.set(transport.sessionId, transport);

  res.on('close', () => {
    console.log('[service-mcp] Koneksi SSE ditutup:', transport.sessionId);
    transports.delete(transport.sessionId);
  });

  await mcpServer.connect(transport);
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: 'SSE session tidak ditemukan' });
    return;
  }

  await transport.handlePostMessage(req, res);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[service-mcp] SSE Server berjalan di http://127.0.0.1:${PORT}/sse`);
});