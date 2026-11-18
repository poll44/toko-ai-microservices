<script setup lang="ts">
import type { Landing, Order, OrderStatus, Product, Ticket } from '~/types';

/** Board 01 - Storefront & Checkout (CUSTOMER) */
const { data, request } = useApi();
const { user, role } = useAuth();
const { version, bump } = useDataVersion();
const { success, error, info } = useToast();
const agent = useAgent();

const landing = ref<Landing | null>(null);
const products = ref<Product[]>([]);
const orders = ref<Order[]>([]);
const tickets = ref<Ticket[]>([]);
const loading = ref(true);
const loadError = ref<string | null>(null);
const buying = ref<string | null>(null);
const paying = ref<string | null>(null);
const reportFor = ref<Order | null>(null);
const filter = ref<'ALL' | OrderStatus>('ALL');
const ordersEl = ref<HTMLElement | null>(null);
const productsEl = ref<HTMLElement | null>(null);

const isCustomer = computed(() => role.value === 'CUSTOMER');

async function loadCatalog() {
  const [l, p] = await Promise.all([
    data<Landing>('/api/catalog/landing'),
    data<Product[]>('/api/catalog/products'),
  ]);
  landing.value = l;
  products.value = p;
}

async function loadMine() {
  if (!isCustomer.value) {
    orders.value = [];
    tickets.value = [];
    return;
  }
  // Untuk CUSTOMER, service-order & service-ticket otomatis memfilter by x-user-id
  const [o, t] = await Promise.all([data<Order[]>('/api/orders'), data<Ticket[]>('/api/tickets')]);
  orders.value = o;
  tickets.value = t;
}

async function loadAll() {
  loadError.value = null;
  try {
    await Promise.all([loadCatalog(), loadMine()]);
  } catch (e: any) {
    loadError.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(loadAll);
watch([() => user.value?.id, version], loadAll);

const lowStock = computed(() => products.value.filter((p) => p.stock <= 5).length);
const minPrice = computed(() => (products.value.length ? Math.min(...products.value.map((p) => p.price)) : 0));
const ticketByOrder = computed(() => {
  const m = new Map<string, Ticket>();
  for (const t of tickets.value) if (t.order_id && !m.has(t.order_id)) m.set(t.order_id, t);
  return m;
});
const counts = computed(() => ({
  ALL: orders.value.length,
  PAID: orders.value.filter((o) => o.status === 'PAID').length,
  PENDING: orders.value.filter((o) => o.status === 'PENDING').length,
  FAILED: orders.value.filter((o) => o.status === 'FAILED').length,
}));
const visibleOrders = computed(() =>
  filter.value === 'ALL' ? orders.value : orders.value.filter((o) => o.status === filter.value)
);

/** POST /api/orders — service-order cek & potong stok di service-catalog */
async function buy(p: Product) {
  if (!isCustomer.value) {
    info('Checkout khusus role CUSTOMER — pilih Budi / Siti di Quick Role Switcher (kanan atas).');
    return;
  }
  buying.value = p.id;
  try {
    const res = await request<{ data: Order }>('/api/orders', { method: 'POST', body: { product_id: p.id, quantity: 1 } });
    success(`Order ${res.data.id} dibuat (PENDING). Silakan simulasikan pembayaran.`);
    bump();
    filter.value = 'ALL';
    ordersEl.value?.scrollIntoView({ behavior: 'smooth' });
  } catch (e: any) {
    error(e.message);
  } finally {
    buying.value = null;
  }
}

/** Order gagal (mis. lewat batas waktu bayar) -> buat order baru untuk produk & qty yang sama */
async function reorder(o: Order) {
  buying.value = `reorder:${o.id}`;
  try {
    const res = await request<{ data: Order }>('/api/orders', {
      method: 'POST',
      body: { product_id: o.product_id, quantity: o.quantity },
    });
    success(`Order baru ${res.data.id} dibuat dari ${o.id}. Silakan selesaikan pembayaran.`);
    bump();
    filter.value = 'ALL';
  } catch (e: any) {
    error(e.message);
  } finally {
    buying.value = null;
  }
}

/** POST /api/orders/:id/pay { simulate } */
async function pay(o: Order, simulate: 'SUCCESS' | 'FAIL') {
  paying.value = `${o.id}:${simulate}`;
  try {
    const res = await request<{ data: Order; message: string }>(`/api/orders/${o.id}/pay`, {
      method: 'POST',
      body: { simulate },
    });
    (res.data.status === 'PAID' ? success : error)(res.message);
    bump();
  } catch (e: any) {
    error(e.message);
  } finally {
    paying.value = null;
  }
}

function onTicketCreated(t: Ticket) {
  reportFor.value = null;
  success(`Tiket ${t.id} berhasil dibuat — status OPEN.`);
  bump();
}

function askAgent(o: Order) {
  agent.send(`Cek status pesanan ${o.id}`);
}

const NOTE_STYLE: Record<OrderStatus, string> = {
  PAID: 'border-green-200 bg-green-100 text-green-800',
  FAILED: 'border-red-200 bg-red-100 text-red-800 font-mono',
  PENDING: 'border-amber-200 bg-amber-100 text-amber-800',
};
const NOTE_ICON: Record<OrderStatus, string> = { PAID: '✓', FAILED: '⏱', PENDING: '…' };
</script>

<template>
  <div>
    <!-- Promo Banner (landing.promo_banner) -->
    <div class="bg-gradient-to-r from-indigo-600 to-violet-500">
      <div class="mx-auto flex max-w-page items-center justify-center gap-3 px-4 py-3 text-center">
        <span class="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-extrabold tracking-widest text-white">PROMO</span>
        <span class="text-sm font-semibold text-white">{{ landing?.promo_banner ?? '…' }}</span>
      </div>
    </div>

    <div v-if="loadError" class="mx-auto mt-6 max-w-page px-4 lg:px-20">
      <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Gagal memuat data dari gateway: {{ loadError }}. Pastikan service-gateway (:8080) & domain service sudah berjalan.
        <button class="ml-2 font-bold underline" @click="loadAll">Coba lagi</button>
      </div>
    </div>

    <!-- Hero -->
    <section class="bg-white">
      <div class="mx-auto grid max-w-page items-center gap-12 px-4 py-16 lg:grid-cols-[680px_1fr] lg:px-20 lg:py-[72px]">
        <div class="flex flex-col gap-5">
          <span class="w-fit rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600">✦ Setup Productivity Store</span>
          <h1 class="text-4xl font-extrabold leading-[1.1] tracking-tight text-zinc-950 lg:text-[56px]">
            <span v-if="landing">{{ landing.hero_title }}</span>
            <span v-else class="block h-14 w-3/4 animate-pulse rounded-lg bg-zinc-100" />
          </h1>
          <p class="text-lg leading-relaxed text-zinc-500 lg:text-[19px]">{{ landing?.hero_subtitle }}</p>
          <div class="flex flex-wrap gap-3">
            <UiButton @click="productsEl?.scrollIntoView({ behavior: 'smooth' })">Belanja Sekarang →</UiButton>
            <UiButton variant="secondary" @click="ordersEl?.scrollIntoView({ behavior: 'smooth' })">Lihat Pesanan Saya</UiButton>
          </div>
          <span class="api-hint">GET /api/catalog/landing → { hero_title, hero_subtitle, promo_banner }</span>
        </div>
        <div class="flex min-h-[380px] flex-col justify-end gap-4 rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-600 to-violet-500 p-8">
          <span class="text-6xl font-extrabold tracking-tighter text-white">TokoAI</span>
          <span class="text-sm font-medium text-indigo-200">Keyboard · Mouse · Hub · Deskmat</span>
          <div class="flex flex-wrap gap-3">
            <div v-for="s in [
              { v: products.length, l: 'Produk aktif' },
              { v: lowStock, l: 'Stok menipis' },
              { v: minPrice ? rupiah(minPrice) : '—', l: 'Mulai dari' },
            ]" :key="s.l" class="rounded-[14px] border border-indigo-400 bg-white/10 px-4 py-3">
              <p class="text-xl font-extrabold text-white">{{ s.v }}</p>
              <p class="text-[11px] font-medium text-indigo-100">{{ s.l }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Product grid -->
    <section ref="productsEl" class="mx-auto flex max-w-page flex-col gap-6 px-4 py-16 lg:px-20">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 class="text-[28px] font-extrabold tracking-tight text-zinc-950">Produk Pilihan</h2>
          <p class="text-sm text-zinc-500">{{ products.length }} produk tersedia · harga sudah termasuk PPN</p>
        </div>
        <span class="api-hint">GET /api/catalog/products</span>
      </div>
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <template v-if="loading">
          <div v-for="i in 4" :key="i" class="h-[380px] animate-pulse rounded-2xl bg-zinc-200/60" />
        </template>
        <ProductCard v-for="p in products" v-else :key="p.id" :product="p" :loading="buying === p.id" @buy="buy" />
      </div>
    </section>

    <!-- My Orders -->
    <section ref="ordersEl" class="mx-auto flex max-w-page scroll-mt-24 flex-col gap-5 px-4 pb-24 pt-4 lg:px-20 xl:pr-[504px]">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 class="text-[28px] font-extrabold tracking-tight text-zinc-950">Pesanan Saya (My Orders)</h2>
          <p class="text-sm text-zinc-500">Riwayat transaksi & simulasi pembayaran fiktif</p>
        </div>
        <span class="api-hint">GET /api/orders{{ user ? ` · x-user-id: ${user.id}` : '' }}</span>
      </div>

      <div v-if="!isCustomer" class="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white p-6">
        <p class="font-bold text-zinc-900">Login sebagai Customer untuk melihat & membuat pesanan.</p>
        <p class="text-sm text-zinc-500">
          Gunakan <b>Quick Role Switcher</b> di kanan atas (Budi / Siti). Role aktif saat ini:
          <span class="font-mono">{{ role }}</span>.
        </p>
      </div>

      <template v-else>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="f in (['ALL', 'PAID', 'PENDING', 'FAILED'] as const)"
            :key="f"
            class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
            :class="filter === f ? 'bg-zinc-950 text-white' : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'"
            @click="filter = f"
          >
            {{ f === 'ALL' ? 'Semua' : f }} <span class="text-[11px] font-bold text-zinc-400">{{ counts[f] }}</span>
          </button>
        </div>

        <p v-if="!visibleOrders.length" class="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
          Belum ada pesanan{{ filter !== 'ALL' ? ` dengan status ${filter}` : '' }}. Klik "Beli Sekarang" pada produk di atas.
        </p>

        <article
          v-for="o in visibleOrders"
          :key="o.id"
          class="flex flex-col gap-3.5 rounded-2xl border bg-white p-5"
          :class="o.status === 'FAILED' ? 'border-red-200' : 'border-zinc-200'"
        >
          <div class="flex items-center gap-3.5">
            <span class="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl bg-indigo-50 font-mono text-[10px] font-bold text-indigo-600">{{ o.product_id }}</span>
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-[13px] font-bold text-zinc-950">{{ o.id }}</span>
                <span class="text-xs text-zinc-400">· {{ formatDate(o.created_at) }}</span>
              </div>
              <span class="text-[15px] font-bold text-zinc-900">{{ o.product_name }} ×{{ o.quantity }}</span>
            </div>
            <div class="flex flex-col items-end gap-1.5">
              <StatusBadge :status="o.status" />
              <span class="text-[17px] font-extrabold text-zinc-950">{{ rupiah(o.total_price) }}</span>
            </div>
          </div>

          <div v-if="o.payment_note" class="flex items-start gap-2 rounded-[10px] border px-3 py-2.5 text-xs font-medium" :class="NOTE_STYLE[o.status]">
            <span class="font-bold">{{ NOTE_ICON[o.status] }}</span>
            <span class="break-words">{{ o.payment_note }}</span>
          </div>

          <!-- Hasil penanganan laporan (resolution_note dari Admin Dev) -->
          <template v-if="ticketByOrder.get(o.id)">
            <div
              v-if="ticketByOrder.get(o.id)!.status === 'RESOLVED'"
              class="flex flex-col gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-bold text-emerald-800">💬 Penjelasan dari Tim TokoAI</span>
                <span class="font-mono text-[11px] text-emerald-700">· {{ ticketByOrder.get(o.id)!.id }}</span>
                <StatusBadge status="RESOLVED" />
              </div>
              <p class="text-sm leading-relaxed text-emerald-950">
                {{ ticketByOrder.get(o.id)!.resolution_note || 'Laporan Anda telah selesai ditangani oleh tim kami.' }}
              </p>
              <span v-if="ticketByOrder.get(o.id)!.resolved_at" class="text-[11px] text-emerald-700">
                Diselesaikan {{ formatDate(ticketByOrder.get(o.id)!.resolved_at!) }}
              </span>
            </div>
            <div v-else class="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-900">
              <span>⏳</span>
              <span class="flex-1">
                Laporan <b class="font-mono">{{ ticketByOrder.get(o.id)!.id }}</b>
                {{ ticketByOrder.get(o.id)!.status === 'ESCALATED' ? 'sedang diinvestigasi oleh tim developer.' : 'sudah kami terima dan sedang ditinjau.' }}
                Penjelasan akan muncul di sini setelah selesai.
              </span>
              <StatusBadge :status="ticketByOrder.get(o.id)!.status" />
            </div>
          </template>

          <div class="flex flex-wrap items-center gap-2">
            <template v-if="o.status === 'PENDING'">
              <UiButton variant="success" :loading="paying === `${o.id}:SUCCESS`" :disabled="!!paying" @click="pay(o, 'SUCCESS')">✓ Bayar Sukses</UiButton>
              <UiButton variant="danger" :loading="paying === `${o.id}:FAIL`" :disabled="!!paying" @click="pay(o, 'FAIL')">✕ Simulasi Gagal</UiButton>
            </template>
            <UiButton v-if="o.status === 'PAID'" variant="secondary" @click="askAgent(o)">✦ Tanya AI soal order ini</UiButton>

            <UiButton
              v-if="o.status === 'FAILED'"
              variant="primary"
              :loading="buying === `reorder:${o.id}`"
              @click="reorder(o)"
            >
              ↻ Pesan Ulang
            </UiButton>

            <span class="flex-1" />
            <UiButton
              v-if="o.status !== 'PAID' && !ticketByOrder.get(o.id)"
              :variant="o.status === 'FAILED' ? 'danger' : 'secondary'"
              @click="reportFor = o"
            >
              ⚑ Laporkan Masalah
            </UiButton>
          </div>
        </article>

        <div class="flex flex-col gap-1 px-1">
          <span class="api-hint">POST /api/orders/:id/pay  { simulate: "SUCCESS" | "FAIL" }</span>
          <span class="api-hint">POST /api/tickets  { order_id, category, subject, description }</span>
        </div>
      </template>
    </section>

    <ReportTicketModal :order="reportFor" @close="reportFor = null" @created="onTicketCreated" />
  </div>
</template>
