import { Router } from 'express';
import type { Request, Response } from 'express';
import db from '../db/database.js';
import { requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// --- LANDING PAGE ROUTES ---
router.get('/landing', (_req: Request, res: Response) => {
  const landing = db.prepare('SELECT * FROM landing_sections WHERE id = 1').get();
  res.json({ data: landing });
});

router.patch('/landing', requireRole(['ADMIN_SISTEM']), (req: Request, res: Response) => {
  const { hero_title, hero_subtitle, promo_banner } = req.body;
  const current = db.prepare('SELECT * FROM landing_sections WHERE id = 1').get() as any;

  db.prepare(
    'UPDATE landing_sections SET hero_title = ?, hero_subtitle = ?, promo_banner = ? WHERE id = 1'
  ).run(
    hero_title ?? current.hero_title,
    hero_subtitle ?? current.hero_subtitle,
    promo_banner ?? current.promo_banner
  );

  const updated = db.prepare('SELECT * FROM landing_sections WHERE id = 1').get();
  res.json({ message: 'Landing page berhasil diperbarui', data: updated });
});

// --- PRODUCT ROUTES ---
router.get('/products', (req: Request, res: Response) => {
  const maxStock = req.query.maxStock ? Number(req.query.maxStock) : null;

  if (maxStock !== null) {
    const lowStock = db.prepare('SELECT * FROM products WHERE stock <= ?').all(maxStock);
    res.json({ data: lowStock });
    return;
  }

  const products = db.prepare('SELECT * FROM products').all();
  res.json({ data: products });
});

router.get('/products/:id', (req: Request, res: Response) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Produk tidak ditemukan' });
    return;
  }
  res.json({ data: product });
});

router.post('/products', requireRole(['ADMIN_SISTEM']), (req: Request, res: Response) => {
  const { id, name, description, price, stock } = req.body;
  if (!id || !name || price == null || stock == null) {
    res.status(400).json({ error: 'Field id, name, price, dan stock wajib diisi' });
    return;
  }

  db.prepare(
    'INSERT INTO products (id, name, description, price, stock) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, description || '', Number(price), Number(stock));

  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.status(201).json({ message: 'Produk berhasil ditambahkan', data: created });
});

// Update stok (bisa dipanggil ADMIN_SISTEM atau internal service-order)
router.patch(
  '/products/:id/stock',
  requireRole(['ADMIN_SISTEM', 'SYSTEM_INTERNAL']),
  (req: Request, res: Response) => {
    const { delta } = req.body; // contoh: -2 untuk kurangi stok, +5 untuk restock
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;

    if (!product) {
      res.status(404).json({ error: 'Produk tidak ditemukan' });
      return;
    }

    const newStock = product.stock + Number(delta);
    if (newStock < 0) {
      res.status(400).json({ error: 'Stok tidak mencukupi' });
      return;
    }

    db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, req.params.id);
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json({ message: 'Stok berhasil diperbarui', data: updated });
  }
);

export default router;