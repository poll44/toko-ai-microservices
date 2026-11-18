import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// File SQLite disimpan di ./data (folder yang sama dipakai saat jalan manual maupun via Docker bind mount)
const DB_PATH = process.env.DB_PATH || './data/order.db';
mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    status TEXT NOT NULL,          -- PENDING | PAID | FAILED
    payment_note TEXT,
    created_at TEXT NOT NULL
  );
`);

// Seeding data awal untuk simulasi kasus AI Agent & Helpdesk
const count = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };

if (count.count === 0) {
  const insert = db.prepare(`
    INSERT INTO orders (id, user_id, product_id, product_name, quantity, total_price, status, payment_note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run('ORD-101', 'USR-01', 'PRD-01', 'Mechanical Keyboard Wireless', 1, 850000, 'PAID', 'Pembayaran VA BCA berhasil', '2026-11-17T10:15:00Z');
  insert.run('ORD-102', 'USR-01', 'PRD-02', 'Ergonomic Vertical Mouse', 2, 640000, 'FAILED', 'ERR_PAYMENT_GATEWAY_TIMEOUT: Saldo terpotong tapi callback gagal', '2026-11-18T08:30:00Z');
  insert.run('ORD-103', 'USR-02', 'PRD-03', 'USB-C Hub 7-in-1', 1, 275000, 'PENDING', 'Menunggu simulasi konfirmasi bayar', '2026-11-18T09:05:00Z');
}

export default db;