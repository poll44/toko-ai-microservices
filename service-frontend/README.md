# service-frontend

Nuxt 3 + Tailwind (SPA) untuk TokoAI Microservices — implementasi dari desain Penpot
(board `01 Storefront`, `02 Dashboard Operasional`, `03 Antrean Dev`).

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
```

Pastikan service lain sudah jalan: gateway :8080, catalog :4001, order :4002, ticket :4003,
mcp :5000, dan agent (`npm run api` di service-agent → :8000).

Frontend **hanya** berbicara ke `service-gateway`. Ubah alamatnya dengan
`NUXT_PUBLIC_API_BASE=http://host:8080`.

## Halaman

| Route    | Role          | Endpoint utama (via gateway) |
|----------|---------------|------------------------------|
| `/`      | Guest/CUSTOMER| `GET /api/catalog/landing`, `GET /api/catalog/products`, `POST /api/orders`, `POST /api/orders/:id/pay`, `POST /api/tickets` |
| `/admin` | ADMIN_SISTEM  | `PATCH /api/catalog/landing`, `GET /api/catalog/products?maxStock=5`, `PATCH /api/catalog/products/:id/stock`, `GET /api/orders?status=FAILED`, `PATCH /api/tickets/:id/escalate` |
| `/dev`   | ADMIN_DEV     | `GET /api/tickets?status=ESCALATED|RESOLVED`, `GET /api/orders/:id`, `PATCH /api/tickets/:id/resolve` |

- **Quick Role Switcher**: `GET /auth/demo-users` + `POST /auth/login` (password demo `123456`), JWT disimpan di localStorage.
- **AI Assistant**: `POST /api/agent/apps/agent/users/{id}/sessions` lalu `POST /api/agent/run`.
  Identitas & role dikirim sebagai konteks di awal pesan; event `functionCall`/`functionResponse`
  ditampilkan sebagai bubble *MCP Tool Call*. Setelah tool yang mengubah data
  (`create_support_ticket`, `escalate_ticket_to_dev`, `resolve_dev_ticket`, `update_landing_banner`)
  halaman otomatis me-refresh datanya.

## Struktur

```
components/  UiButton, StatusBadge, ProductCard, ChatBubble   ← komponen Design System Penpot
             TopNavbar, RoleSwitcher, AiAssistantWidget, AdminPanel, KpiCard, RoleGate, ...
composables/ useAuth, useApi (client gateway), useAgent (ADK), useToast/useDataVersion
pages/       index.vue, admin.vue, dev.vue
types/       kontrak data sesuai skema SQLite tiap service
```
