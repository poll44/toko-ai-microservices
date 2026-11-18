import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { callService } from '../client/serviceClient.js';

const CATALOG_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:4001';
const ORDER_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:4002';
const TICKET_URL = process.env.TICKET_SERVICE_URL || 'http://localhost:4003';

export function registerAllTools(server: McpServer) {
  // ==========================================
  // 1. TOOLS DOMAIN CATALOG (Port 4001)
  // ==========================================
  server.tool(
    'get_all_products',
    'Mengambil seluruh daftar produk beserta harga dan sisa stok dari service-catalog.',
    {},
    async () => {
      const res = await callService(`${CATALOG_URL}/api/products`);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    }
  );

  server.tool(
    'get_low_stock_products',
    'Mencari produk yang sisa stoknya kurang dari atau sama dengan batas tertentu (threshold).',
    {
      threshold: z.number().default(5).describe('Batas maksimal jumlah stok (contoh: 5)'),
    },
    async ({ threshold }) => {
      const res = await callService(`${CATALOG_URL}/api/products?maxStock=${threshold}`);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    }
  );
 //vaoak
  server.tool(
    'update_landing_banner',
    'Mengubah teks hero atau promo banner di landing page. Hanya boleh dilakukan oleh ADMIN_SISTEM.',
    {
      actor_role: z.enum(['CUSTOMER', 'ADMIN_SISTEM', 'ADMIN_DEV']).describe('Role pengguna yang memerintah'),
      hero_title: z.string().optional().describe('Judul utama hero section baru'),
      promo_banner: z.string().optional().describe('Teks banner promo baru'),
    },
    async ({ actor_role, hero_title, promo_banner }) => {
      try {
        const res = await callService(`${CATALOG_URL}/api/landing`, {
          method: 'PATCH',
          role: actor_role,
          body: { hero_title, promo_banner },
        });
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  // ==========================================
  // 2. TOOLS DOMAIN ORDER (Port 4002)
  // ==========================================
  server.tool(
    'get_order_by_id',
    'Mengecek detail dan status pembayaran pesanan berdasarkan ID order (contoh: ORD-102).',
    {
      order_id: z.string().describe('ID pesanan seperti ORD-101 atau ORD-102'),
    },
    async ({ order_id }) => {
      try {
        const res = await callService(`${ORDER_URL}/api/orders/${order_id}`);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_orders_by_status',
    'Mengambil daftar pesanan berdasarkan status pembayaran (PENDING, PAID, atau FAILED).',
    {
      status: z.enum(['PENDING', 'PAID', 'FAILED']).describe('Status transaksi'),
    },
    async ({ status }) => {
      const res = await callService(`${ORDER_URL}/api/orders?status=${status}`, {
        role: 'ADMIN_SISTEM',
      });
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    }
  );

  // ==========================================
  // 3. TOOLS DOMAIN TICKET (Port 4003)
  // ==========================================
  server.tool(
    'get_tickets',
    'Mengambil daftar tiket laporan/keluhan/bug. Bisa difilter berdasarkan status (OPEN, ESCALATED, RESOLVED).',
    {
      status: z.enum(['OPEN', 'ESCALATED', 'RESOLVED']).optional().describe('Filter status tiket'),
    },
    async ({ status }) => {
      const query = status ? `?status=${status}` : '';
      const res = await callService(`${TICKET_URL}/api/tickets${query}`, {
        role: 'ADMIN_SISTEM',
      });
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    }
  );

  server.tool(
    'create_support_ticket',
    'Membuat tiket laporan/komplain baru atas nama Customer (misalnya saat pembayaran gagal).',
    {
      user_id: z.string().default('USR-01').describe('ID customer pelapor'),
      order_id: z.string().optional().describe('ID pesanan terkait jika ada'),
      category: z.enum(['PAYMENT_ISSUE', 'BUG_UI', 'GENERAL']).default('PAYMENT_ISSUE'),
      subject: z.string().describe('Judul singkat laporan'),
      description: z.string().describe('Penjelasan detail masalah'),
    },
    async ({ user_id, order_id, category, subject, description }) => {
      const res = await callService(`${TICKET_URL}/api/tickets`, {
        method: 'POST',
        role: 'CUSTOMER',
        userId: user_id,
        body: { order_id, category, subject, description },
      });
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    }
  );

  server.tool(
    'escalate_ticket_to_dev',
    'Mengeskalasi tiket laporan ke Admin Developer untuk perbaikan teknis. Khusus ADMIN_SISTEM.',
    {
      actor_role: z.enum(['CUSTOMER', 'ADMIN_SISTEM', 'ADMIN_DEV']).describe('Role pengguna yang memerintah'),
      ticket_id: z.string().describe('ID tiket seperti TCK-01'),
      note: z.string().optional().describe('Catatan teknis untuk developer'),
    },
    async ({ actor_role, ticket_id, note }) => {
      try {
        const res = await callService(`${TICKET_URL}/api/tickets/${ticket_id}/escalate`, {
          method: 'PATCH',
          role: actor_role,
          body: { note },
        });
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  server.tool(
    'resolve_dev_ticket',
    'Menandai tiket bug sebagai RESOLVED setelah selesai diperbaiki. Khusus ADMIN_DEV.',
    {
      actor_role: z.enum(['CUSTOMER', 'ADMIN_SISTEM', 'ADMIN_DEV']).describe('Role pengguna yang memerintah'),
      ticket_id: z.string().describe('ID tiket seperti TCK-02'),
      resolution_note: z
        .string()
        .describe(
          'Penjelasan hasil penanganan yang AKAN DITAMPILKAN KE CUSTOMER. Tulis sopan, non-teknis, dalam Bahasa Indonesia, sebutkan penyebab & langkah selanjutnya (contoh: pembayaran melewati batas waktu, silakan pesan ulang).'
        ),
    },
    async ({ actor_role, ticket_id, resolution_note }) => {
      try {
        const res = await callService(`${TICKET_URL}/api/tickets/${ticket_id}/resolve`, {
          method: 'PATCH',
          role: actor_role,
          body: { resolution_note },
        });
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    }
  );
}