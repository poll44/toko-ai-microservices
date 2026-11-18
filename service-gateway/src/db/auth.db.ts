import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// File SQLite disimpan di ./data (folder yang sama dipakai saat jalan manual maupun via Docker bind mount)
const DB_PATH = process.env.DB_PATH || './data/auth.db';
mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL -- CUSTOMER | ADMIN_SISTEM | ADMIN_DEV
  );
`);

const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

if (count.count === 0) {
  const insert = db.prepare(
    'INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)'
  );
  insert.run('USR-01', 'budi@toko.com', '123456', 'Budi Santoso (Customer)', 'CUSTOMER');
  insert.run('USR-02', 'siti@toko.com', '123456', 'Siti Aminah (Customer)', 'CUSTOMER');
  insert.run('ADM-01', 'admin@toko.com', '123456', 'Rina (Admin Sistem)', 'ADMIN_SISTEM');
  insert.run('DEV-01', 'dev@toko.com', '123456', 'Faiz (Admin Developer)', 'ADMIN_DEV');
}

export default db;