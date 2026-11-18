# TokoAI Microservices

TokoAI adalah contoh **toko online** yang dibangun dengan arsitektur **microservices**
dan dilengkapi **asisten AI** (Google Gemini). Asisten ini bisa menjawab pertanyaan,
mengecek stok, membuat tiket keluhan, dan lainnya, langsung dari jendela chat.

Proyek ini cocok untuk belajar:
- cara memecah aplikasi menjadi beberapa service kecil yang saling berkomunikasi,
- cara menghubungkan AI agent ke data aplikasi lewat **MCP (Model Context Protocol)**,
- cara menjalankan semuanya sekaligus dengan **Docker Compose**.

---

## Daftar Isi

1. [Gambaran Singkat](#gambaran-singkat)
2. [Fitur](#fitur)
3. [Arsitektur](#arsitektur)
4. [Yang Perlu Disiapkan](#yang-perlu-disiapkan)
5. [Cara Menjalankan (Docker, paling mudah)](#cara-menjalankan-docker-paling-mudah)
6. [Akun Demo](#akun-demo)
7. [Cara Menjalankan Tanpa Docker](#cara-menjalankan-tanpa-docker)
8. [Konfigurasi `.env`](#konfigurasi-env)
9. [Database](#database)
10. [Struktur Folder](#struktur-folder)
11. [Masalah Umum](#masalah-umum)

---

## Gambaran Singkat

Aplikasi ini terdiri dari **7 service**. Masing-masing berjalan sendiri di port berbeda:

| Service | Port | Fungsinya |
|---|---|---|
| `service-frontend` | 3000 | Tampilan website (Nuxt 3). **Ini yang Anda buka di browser.** |
| `service-gateway` | 8080 | Pintu masuk utama: login (JWT) dan meneruskan permintaan ke service lain |
| `service-catalog` | 4001 | Data produk & banner halaman depan |
| `service-order` | 4002 | Pesanan & simulasi pembayaran |
| `service-ticket` | 4003 | Tiket bantuan (helpdesk) |
| `service-mcp` | 5000 | "Jembatan" agar AI bisa membaca/mengubah data toko (MCP server) |
| `service-agent` | 8000 | Otak AI-nya (Google ADK + Gemini) |

> Browser **hanya** berbicara dengan `gateway` (port 8080). Service lain tidak diakses langsung.

## Fitur

Ada tiga halaman dengan peran (role) berbeda:

| Halaman | Untuk siapa | Yang bisa dilakukan |
|---|---|---|
| `/` Storefront | Pengunjung & **Customer** | Lihat produk, pesan, bayar (simulasi), kirim keluhan |
| `/admin` Dashboard | **Admin Sistem** | Ubah banner, pantau stok menipis, lihat order gagal, eskalasi tiket ke developer |
| `/dev` Antrean Dev | **Admin Developer** | Lihat tiket yang dieskalasi, periksa detail order, tandai tiket selesai |

Di setiap halaman ada **AI Assistant** (widget chat). AI ini bisa memakai "tools" berikut
(disediakan oleh `service-mcp`):

| Tool | Kegunaan |
|---|---|
| `get_all_products` | Melihat semua produk |
| `get_low_stock_products` | Mencari produk yang stoknya menipis |
| `get_order_by_id` / `get_orders_by_status` | Mengecek pesanan |
| `get_tickets` | Melihat daftar tiket |
| `create_support_ticket` | Membuat tiket keluhan |
| `escalate_ticket_to_dev` | Meneruskan tiket ke developer |
| `resolve_dev_ticket` | Menandai tiket selesai |
| `update_landing_banner` | Mengubah banner halaman depan |

Contoh pertanyaan ke AI: *"Produk apa yang stoknya hampir habis?"* atau
*"Order saya ORD-xxx kok gagal?"*

## Arsitektur

```
                 ┌──────────────┐
   Browser ────▶ │   frontend   │  :3000
                 └──────┬───────┘
                        │ semua request lewat gateway
                 ┌──────▼───────┐
                 │   gateway    │  :8080  (login JWT + proxy)
                 └──┬───┬───┬───┬┘
         ┌──────────┘   │   │   └──────────────┐
         ▼              ▼   ▼                  ▼
    ┌─────────┐  ┌───────┐ ┌────────┐     ┌─────────┐
    │ catalog │◀─│ order │ │ ticket │     │  agent  │ :8000 (Gemini)
    └─────────┘  └───────┘ └────────┘     └────┬────┘
         ▲            ▲         ▲              │ MCP (SSE)
         └────────────┴─────────┴──────── ┌────▼────┐
                                          │   mcp   │ :5000
                                          └─────────┘
```

- Service saling memanggil dengan header rahasia bersama (`INTERNAL_API_KEY`).
- AI tidak menyentuh database secara langsung. Ia memanggil tools di `mcp`, lalu `mcp`
  memanggil `catalog` / `order` / `ticket`.

## Yang Perlu Disiapkan

1. **Git** untuk mengunduh proyek.
2. **Docker Desktop**. Unduh di <https://www.docker.com/products/docker-desktop/> dan
   pastikan aplikasinya sudah **berjalan** sebelum mengikuti langkah di bawah.
3. **Gemini API Key** (gratis). Buat di <https://aistudio.google.com/app/apikey>.
4. *(Hanya jika tanpa Docker)* **Node.js versi 22** atau lebih baru: <https://nodejs.org/>

## Cara Menjalankan (Docker, paling mudah)

### 1. Unduh proyek

```bash
git clone https://github.com/poll44/toko-ai-microservices.git
cd toko-ai-microservices
```

### 2. Buat file `.env` untuk setiap service

Setiap service punya file contoh bernama `.env.example`. Salin menjadi `.env`:

**Windows (PowerShell):**
```powershell
Get-ChildItem service-*/.env.example | ForEach-Object { Copy-Item $_ ($_.FullName -replace '\.example$','') }
```

**macOS / Linux / Git Bash:**
```bash
for f in service-*/.env.example; do cp "$f" "${f%.example}"; done
```

### 3. Isi nilai rahasia

Buka file-file `.env` tersebut, lalu ganti:

| Variabel | Ada di file | Isi dengan |
|---|---|---|
| `GEMINI_API_KEY` | `service-agent/.env` | API key Gemini Anda |
| `JWT_SECRET` | `service-gateway/.env` | Teks acak yang panjang (bebas, mis. 32+ karakter) |
| `INTERNAL_API_KEY` | `catalog`, `order`, `ticket`, `mcp`, `gateway` | Teks acak. **Harus sama persis di semua file!** |

> Untuk sekadar mencoba di komputer sendiri, `JWT_SECRET` dan `INTERNAL_API_KEY` boleh
> dibiarkan nilai bawaannya. Yang **wajib** diisi hanya `GEMINI_API_KEY`.

### 4. Jalankan

```bash
docker compose up -d --build
```

Proses pertama kali butuh beberapa menit. Cek apakah semua sudah siap:

```bash
docker compose ps
```

Tunggu sampai semua service berstatus **healthy**, lalu buka **<http://localhost:3000>** 🎉

### Perintah Docker yang sering dipakai

| Perintah | Kegunaan |
|---|---|
| `docker compose ps` | Melihat status semua service |
| `docker compose logs -f agent` | Melihat log satu service (ganti `agent` sesuai kebutuhan) |
| `docker compose up -d --build order` | Build ulang satu service setelah kodenya diubah |
| `docker compose down` | Menghentikan semua service (data tetap aman) |

## Akun Demo

Akun ini dibuat otomatis saat pertama kali dijalankan. Di website, pakai tombol
**Quick Role Switcher** untuk berganti akun tanpa mengetik password.

| Email | Password | Peran |
|---|---|---|
| `budi@toko.com` | `123456` | Customer |
| `siti@toko.com` | `123456` | Customer |
| `admin@toko.com` | `123456` | Admin Sistem |
| `dev@toko.com` | `123456` | Admin Developer |

## Cara Menjalankan Tanpa Docker

Cara ini dipakai kalau Anda ingin mengubah kode dan langsung melihat hasilnya (hot reload).

1. Ikuti langkah **2** dan **3** di atas untuk menyiapkan file `.env`.
2. Install dependensi di setiap folder service:
   ```bash
   cd service-catalog && npm install && cd ..
   # ulangi untuk service-order, service-ticket, service-mcp, service-agent, service-gateway, service-frontend
   ```
3. Buka **7 terminal terpisah** dan jalankan **sesuai urutan** berikut:

   | Urutan | Folder | Perintah |
   |---|---|---|
   | 1 | `service-catalog` | `npm run dev` |
   | 2 | `service-order` | `npm run dev` |
   | 3 | `service-ticket` | `npm run dev` |
   | 4 | `service-mcp` | `npm run dev` |
   | 5 | `service-agent` | `npm run api` |
   | 6 | `service-gateway` | `npm run dev` |
   | 7 | `service-frontend` | `npm run dev` |

4. Buka **<http://localhost:3000>**.

> ⚠️ Jangan menjalankan versi Docker dan versi manual **bersamaan**. Port-nya akan bentrok.
> Hentikan Docker dulu dengan `docker compose down`.

## Konfigurasi `.env`

- File `.env` berisi **rahasia** (API key, dll.) dan **tidak ikut di-commit** ke Git
  (sudah diatur di `.gitignore`). Jangan pernah membagikan isinya.
- File `.env.example` hanya berisi contoh tanpa nilai rahasia. File inilah yang di-commit.
- Saat dijalankan dengan Docker, alamat antar-service (`..._SERVICE_URL`) otomatis diganti
  oleh `docker-compose.yml`, jadi tidak perlu diubah.

## Database

Proyek ini memakai **SQLite**: database berupa satu file, **tanpa perlu install MySQL/XAMPP**.

| Service | Lokasi file |
|---|---|
| catalog | `service-catalog/data/catalog.db` |
| order | `service-order/data/order.db` |
| ticket | `service-ticket/data/ticket.db` |
| gateway (akun) | `service-gateway/data/auth.db` |

- File dibuat **otomatis** beserta data contohnya saat service pertama kali jalan.
- File yang sama dipakai baik saat dijalankan dengan Docker maupun manual.
- Untuk melihat isinya, gunakan [DB Browser for SQLite](https://sqlitebrowser.org/)
  atau ekstensi SQLite di VS Code.
- **Reset data ke awal:** hentikan service, hapus file `.db` yang ingin direset, lalu jalankan lagi.

## Struktur Folder

```
toko-ai-microservices/
├── docker-compose.yml     # menjalankan semua service sekaligus
├── service-frontend/      # website (Nuxt 3 + Tailwind)
├── service-gateway/       # login & proxy
├── service-catalog/       # produk & banner
├── service-order/         # pesanan & pembayaran
├── service-ticket/        # tiket helpdesk
├── service-mcp/           # tools untuk AI (MCP server)
└── service-agent/         # AI agent (Google ADK + Gemini)
```

Setiap folder service berisi `src/` (kode), `Dockerfile`, `package.json`, dan `.env.example`.

## Masalah Umum

| Masalah | Solusi |
|---|---|
| `port is already allocated` / port bentrok | Ada program lain yang memakai port tersebut. Biasanya ini versi manual (`npm run dev`) yang masih jalan. Hentikan dulu. |
| AI tidak menjawab / error | Cek `GEMINI_API_KEY` di `service-agent/.env`, lalu lihat log: `docker compose logs -f agent` |
| Error `401` / `403` antar service | Nilai `INTERNAL_API_KEY` belum sama di semua file `.env`. |
| Service `agent` lama sekali "starting" | Normal. Agent butuh ±30 detik untuk build saat start. |
| `docker: command not found` / tidak bisa connect | Docker Desktop belum dibuka/berjalan. |
| Ingin data kembali seperti awal | Lihat bagian [Database](#database) → Reset data. |
