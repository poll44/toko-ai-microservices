import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// File SQLite disimpan di ./data (folder yang sama dipakai saat jalan manual maupun via Docker bind mount)
const DB_PATH = process.env.DB_PATH || './data/ticket.db';
mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    order_id TEXT,
    category TEXT NOT NULL,        -- PAYMENT_ISSUE | BUG_UI | GENERAL
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,          -- OPEN | ESCALATED | RESOLVED
    dev_note TEXT,                 -- catatan INTERNAL Admin Sistem -> Developer
    created_at TEXT NOT NULL,
    resolution_note TEXT,          -- penjelasan hasil penanganan, DITAMPILKAN ke customer
    resolved_at TEXT
  );
`);

// Migrasi untuk ticket.db lama (sebelum kolom resolution_note/resolved_at ada)
const columns = (db.prepare('PRAGMA table_info(tickets)').all() as { name: string }[]).map((c) => c.name);
if (!columns.includes('resolution_note')) {
  db.exec('ALTER TABLE tickets ADD COLUMN resolution_note TEXT');
  // Dulu endpoint resolve menimpa dev_note dengan resolution_note -> pindahkan ke kolom yang benar
  db.exec(`UPDATE tickets SET resolution_note = dev_note WHERE status = 'RESOLVED' AND dev_note IS NOT NULL`);
}
if (!columns.includes('resolved_at')) {
  db.exec('ALTER TABLE tickets ADD COLUMN resolved_at TEXT');
}

const count = db.prepare('SELECT COUNT(*) as count FROM tickets').get() as { count: number };

if (count.count === 0) {
  const insert = db.prepare(`
    INSERT INTO tickets (id, user_id, order_id, category, subject, description, status, dev_note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    'TCK-01',
    'USR-01',
    'ORD-102',
    'PAYMENT_ISSUE',
    'Pembayaran gagal tapi saldo terpotong',
    'Saya checkout Ergonomic Vertical Mouse 2 pcs di ORD-102, status di web FAILED padahal saldo sudah berkurang.',
    'OPEN',
    null,
    '2026-11-18T08:35:00Z'
  );

  insert.run(
    'TCK-02',
    'USR-03',
    null,
    'BUG_UI',
    'Tombol checkout tidak merespons di layar mobile',
    'Saat membuka halaman detail produk lewat HP, tombol beli terpotong footer.',
    'ESCALATED',
    'Dieskalasi Admin Sistem: mohon cek CSS responsive di halaman produk.',
    '2026-11-17T14:20:00Z'
  );
}

export default db;