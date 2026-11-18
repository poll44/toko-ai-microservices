import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// File SQLite disimpan di ./data (folder yang sama dipakai saat jalan manual maupun via Docker bind mount)
const DB_PATH = process.env.DB_PATH || './data/catalog.db';
mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);

// 1. Buat tabel products & landing_sections
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    stock INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS landing_sections (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    hero_title TEXT NOT NULL,
    hero_subtitle TEXT NOT NULL,
    promo_banner TEXT NOT NULL
  );
`);

// 2. Seeding data awal jika tabel masih kosong
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };

if (productCount.count === 0) {
  const insertProduct = db.prepare(
    'INSERT INTO products (id, name, description, price, stock) VALUES (?, ?, ?, ?, ?)'
  );
  insertProduct.run('PRD-01', 'Mechanical Keyboard Wireless', 'Keyboard 75% hot-swappable RGB', 850000, 12);
  insertProduct.run('PRD-02', 'Ergonomic Vertical Mouse', 'Mouse anti pegal koneksi dual-mode', 320000, 3); // Stok menipis untuk tes AI Agent
  insertProduct.run('PRD-03', 'USB-C Hub 7-in-1', 'Adapter HDMI 4K + PD 100W', 275000, 2); // Stok menipis untuk tes AI Agent
  insertProduct.run('PRD-04', 'Deskmat Minimalist Dark', 'Ukuran 80x30cm anti slip', 150000, 25);
}

const landingCount = db.prepare('SELECT COUNT(*) as count FROM landing_sections').get() as { count: number };

if (landingCount.count === 0) {
  db.prepare(
    'INSERT INTO landing_sections (id, hero_title, hero_subtitle, promo_banner) VALUES (1, ?, ?, ?)'
  ).run(
    'Upgrade Setup Kerja Kamu Hari Ini',
    'Perlengkapan produktivitas pilihan untuk developer & kreator.',
    'GRATIS ONGKIR ke seluruh Indonesia minimal belanja Rp 200.000!'
  );
}

export default db;