# Google ADK api_server (TypeScript agent) — terhubung ke service-mcp lewat SSE
FROM node:22-slim
WORKDIR /app

# better-sqlite3 (dependency @google/adk-devtools) bisa perlu di-compile dari source bila
# prebuilt binary untuk versi Node ini tidak tersedia -> butuh python3, make, g++
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src

EXPOSE 8000

# --host 0.0.0.0     : default ADK hanya listen di localhost (tidak bisa dijangkau container lain)
# --allowed_hosts    : guard DNS-rebinding ADK hanya menerima Host loopback; gateway memanggil
#                      dengan Host "agent:8000" (nama service di jaringan docker-compose)
CMD ["node_modules/.bin/adk", "api_server", "src", "--host", "0.0.0.0", "--port", "8000", "--allowed_hosts", "agent,agent:8000"]
