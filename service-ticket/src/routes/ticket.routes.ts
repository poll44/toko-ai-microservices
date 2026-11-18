import { Router } from 'express';
import type { Request, Response } from 'express';
import db from '../db/database.js';
import { requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// 1. Ambil daftar tiket (filter opsional berdasarkan status atau category)
router.get('/tickets', (req: Request, res: Response) => {
  const userRole = (req.headers['x-user-role'] as string) || 'GUEST';
  const userId = (req.headers['x-user-id'] as string) || '';
  const { status, category } = req.query;

  let query = 'SELECT * FROM tickets';
  const params: any[] = [];
  const conditions: string[] = [];

  if (userRole === 'CUSTOMER' && userId) {
    conditions.push('user_id = ?');
    params.push(userId);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(String(status).toUpperCase());
  }

  if (category) {
    conditions.push('category = ?');
    params.push(String(category).toUpperCase());
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';
  const tickets = db.prepare(query).all(...params) as Record<string, unknown>[];

  // dev_note adalah catatan internal tim (Admin Sistem -> Developer), tidak untuk customer.
  // Customer cukup menerima resolution_note sebagai penjelasan hasil penanganan.
  if (userRole === 'CUSTOMER') {
    res.json({ data: tickets.map(({ dev_note: _internal, ...rest }) => rest) });
    return;
  }
  res.json({ data: tickets });
});

// 2. Buat laporan / tiket baru (CUSTOMER)
router.post('/tickets', requireRole(['CUSTOMER']), (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'USR-01';
  const { order_id, category, subject, description } = req.body;

  if (!subject || !description) {
    res.status(400).json({ error: 'subject dan description wajib diisi' });
    return;
  }

  const ticketId = `TCK-${Math.floor(10 + Math.random() * 89)}`;
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO tickets (id, user_id, order_id, category, subject, description, status, dev_note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'OPEN', NULL, ?)
  `).run(
    ticketId,
    userId,
    order_id || null,
    (category || 'GENERAL').toUpperCase(),
    subject,
    description,
    createdAt
  );

  const created = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  res.status(201).json({ message: 'Tiket laporan berhasil dibuat', data: created });
});

// 3. Eskalasi tiket ke Admin Developer (ADMIN_SISTEM)
router.patch('/tickets/:id/escalate', requireRole(['ADMIN_SISTEM']), (req: Request, res: Response) => {
  const { note } = req.body;
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id) as any;

  if (!ticket) {
    res.status(404).json({ error: `Tiket ${req.params.id} tidak ditemukan` });
    return;
  }

  const escalationNote = note || 'Dieskalasi oleh Admin Sistem untuk investigasi teknis Developer.';
  db.prepare('UPDATE tickets SET status = ?, dev_note = ? WHERE id = ?').run(
    'ESCALATED',
    escalationNote,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  res.json({ message: `Tiket ${req.params.id} berhasil dieskalasi ke Developer`, data: updated });
});

// 4. Tandai tiket bug selesai diperbaiki (ADMIN_DEV)
router.patch('/tickets/:id/resolve', requireRole(['ADMIN_DEV']), (req: Request, res: Response) => {
  const { resolution_note } = req.body;
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id) as any;

  if (!ticket) {
    res.status(404).json({ error: `Tiket ${req.params.id} tidak ditemukan` });
    return;
  }

  // resolution_note = penjelasan untuk customer; dev_note (catatan eskalasi internal) tetap disimpan
  const finalNote = resolution_note || 'Laporan Anda telah selesai ditangani oleh tim kami.';
  db.prepare('UPDATE tickets SET status = ?, resolution_note = ?, resolved_at = ? WHERE id = ?').run(
    'RESOLVED',
    finalNote,
    new Date().toISOString(),
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  res.json({ message: `Tiket ${req.params.id} ditandai RESOLVED`, data: updated });
});

export default router;