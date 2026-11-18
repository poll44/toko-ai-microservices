import { Router } from 'express';
import type { Request, Response } from 'express';
import db from '../db/database.js';
import { requireRole } from '../middlewares/auth.middleware.js';

const router = Router();
const CATALOG_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:4001';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';

// 1. Ambil daftar order (CUSTOMER hanya lihat miliknya; ADMIN/DEV lihat semua)
router.get('/orders', (req: Request, res: Response) => {
  const userRole = (req.headers['x-user-role'] as string) || 'GUEST';
  const userId = (req.headers['x-user-id'] as string) || '';
  const statusFilter = req.query.status as string | undefined;

  let query = 'SELECT * FROM orders';
  const params: any[] = [];
  const conditions: string[] = [];

  if (userRole === 'CUSTOMER' && userId) {
    conditions.push('user_id = ?');
    params.push(userId);
  }

  if (statusFilter) {
    conditions.push('status = ?');
    params.push(statusFilter.toUpperCase());
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';
  const orders = db.prepare(query).all(...params);
  res.json({ data: orders });
});

// 2. Ambil detail satu order by ID
router.get('/orders/:id', (req: Request, res: Response) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    res.status(404).json({ error: `Order ${req.params.id} tidak ditemukan` });
    return;
  }
  res.json({ data: order });
});

// 3. Checkout / Buat Order Baru (Komunikasi langsung ke service-catalog!)
router.post('/orders', requireRole(['CUSTOMER']), async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'USR-01';
  const { product_id, quantity } = req.body;

  if (!product_id || !quantity || Number(quantity) <= 0) {
    res.status(400).json({ error: 'product_id dan quantity (> 0) wajib diisi' });
    return;
  }

  try {
    // Langkah A: Cek detail produk ke service-catalog
    const prodRes = await fetch(`${CATALOG_URL}/api/products/${product_id}`, {
      headers: { 'x-internal-api-key': INTERNAL_KEY },
    });

    if (!prodRes.ok) {
      res.status(404).json({ error: 'Produk tidak ditemukan di service-catalog' });
      return;
    }

    const { data: product } = (await prodRes.json()) as any;
    if (product.stock < Number(quantity)) {
      res.status(400).json({ error: `Stok tidak cukup (sisa: ${product.stock})` });
      return;
    }

    // Langkah B: Kurangi stok di service-catalog menggunakan role SYSTEM_INTERNAL
    const stockRes = await fetch(`${CATALOG_URL}/api/products/${product_id}/stock`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': INTERNAL_KEY,
        'x-user-role': 'SYSTEM_INTERNAL',
      },
      body: JSON.stringify({ delta: -Number(quantity) }),
    });

    if (!stockRes.ok) {
      res.status(500).json({ error: 'Gagal memotong stok di service-catalog' });
      return;
    }

    // Langkah C: Simpan order ke database lokal order.db
    const orderId = `ORD-${Math.floor(104 + Math.random() * 895)}`;
    const totalPrice = product.price * Number(quantity);
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO orders (id, user_id, product_id, product_name, quantity, total_price, status, payment_note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 'Menunggu pembayaran fiktif', ?)
    `).run(orderId, userId, product.id, product.name, Number(quantity), totalPrice, createdAt);

    const created = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    res.status(201).json({ message: 'Order berhasil dibuat', data: created });
  } catch (err: any) {
    res.status(502).json({ error: 'Gagal terhubung ke service-catalog', detail: err.message });
  }
});

// Kembalikan stok yang sudah "dipesan" saat checkout ke service-catalog
async function releaseStock(productId: string, quantity: number) {
  const stockRes = await fetch(`${CATALOG_URL}/api/products/${productId}/stock`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-api-key': INTERNAL_KEY,
      'x-user-role': 'SYSTEM_INTERNAL',
    },
    body: JSON.stringify({ delta: Number(quantity) }),
  });
  if (!stockRes.ok) throw new Error(`service-catalog membalas HTTP ${stockRes.status}`);
}

// 4. Simulasi Pembayaran Fiktif (PAID atau FAILED)
//    Stok sudah dipotong saat checkout (reservasi). Jika pembayaran GAGAL, stok dikembalikan.
router.post('/orders/:id/pay', requireRole(['CUSTOMER']), async (req: Request, res: Response) => {
  const { simulate } = req.body; // 'SUCCESS' atau 'FAIL'
  const orderId = String(req.params.id);
  const userId = (req.headers['x-user-id'] as string) || '';
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;

  if (!order) {
    res.status(404).json({ error: 'Order tidak ditemukan' });
    return;
  }
  if (userId && order.user_id !== userId) {
    res.status(403).json({ error: `Forbidden: order ${orderId} bukan milik ${userId}` });
    return;
  }

  const isSuccess = simulate !== 'FAIL';
  const newStatus = isSuccess ? 'PAID' : 'FAILED';
  const note = isSuccess
    ? 'Simulasi pembayaran fiktif BERHASIL'
    : 'ERR_SIMULATED_PAYMENT_DECLINED: Simulasi pembayaran gagal / timeout';

  // Klaim transisi secara atomik: hanya order PENDING yang boleh dibayar.
  // Mencegah FAILED -> PAID tanpa stok, dan pengembalian stok ganda saat request paralel.
  const claimed = db
    .prepare(`UPDATE orders SET status = ?, payment_note = ? WHERE id = ? AND status = 'PENDING'`)
    .run(newStatus, note, orderId);

  if (claimed.changes === 0) {
    res.status(409).json({
      error: `Order ${orderId} berstatus ${order.status}; pembayaran hanya bisa untuk order PENDING`,
    });
    return;
  }

  if (!isSuccess) {
    try {
      await releaseStock(order.product_id, order.quantity);
    } catch (err: any) {
      // Gagal mengembalikan stok -> batalkan transisi agar data tetap konsisten & bisa dicoba lagi
      db.prepare('UPDATE orders SET status = ?, payment_note = ? WHERE id = ?').run(
        'PENDING',
        order.payment_note,
        orderId
      );
      res.status(502).json({ error: 'Gagal mengembalikan stok ke service-catalog, coba lagi', detail: err.message });
      return;
    }
  }

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.json({
    message: isSuccess
      ? `Status pembayaran diperbarui ke PAID`
      : `Status pembayaran diperbarui ke FAILED — stok ${order.quantity} unit ${order.product_id} dikembalikan`,
    data: updated,
  });
});

export default router;