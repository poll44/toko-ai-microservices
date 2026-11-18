# Service Express + TypeScript (dijalankan dengan tsx). Butuh Node >= 22.13 untuk node:sqlite.
FROM node:22-slim
WORKDIR /app

# Layer dependency terpisah agar cache build tetap terpakai saat hanya src yang berubah
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src

# Lokasi file SQLite (jika service memakai DB) — di-mount sebagai volume oleh docker-compose
RUN mkdir -p /app/data

CMD ["node_modules/.bin/tsx", "src/index.ts"]
