# ---------- build ----------
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts: "postinstall: nuxt prepare" butuh source; prepare dijalankan ulang oleh `nuxt build`
RUN npm ci --no-audit --no-fund --ignore-scripts

COPY . .
RUN npx nuxt build

# ---------- runtime ----------
FROM node:22-slim
WORKDIR /app
COPY --from=build /app/.output ./.output

ENV HOST=0.0.0.0 \
    PORT=3000 \
    NODE_ENV=production
# Alamat gateway yang dipakai BROWSER (bukan nama service docker) — bisa di-override saat runtime
ENV NUXT_PUBLIC_API_BASE=http://localhost:8080

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
