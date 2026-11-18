<script setup lang="ts">
import type { Landing, Order, Product, Ticket, TicketStatus } from '~/types';

/** Board 02 - Dashboard Operasional (ADMIN_SISTEM) */
const LOW_STOCK = 5;

const { data, request } = useApi();
const { user, role } = useAuth();
const { version, bump } = useDataVersion();
const { success, error } = useToast();

const products = ref<Product[]>([]);
const lowStock = ref<Product[]>([]);
const failedOrders = ref<Order[]>([]);
const tickets = ref<Ticket[]>([]);
const landing = ref<Landing | null>(null);
const form = reactive({ hero_title: '', hero_subtitle: '', promo_banner: '' });
const loading = ref(true);
const loadError = ref<string | null>(null);
const saving = ref(false);
const restockQty = reactive<Record<string, number>>({});
const restocking = ref<string | null>(null);
const escalateNote = reactive<Record<string, string>>({});
const escalating = ref<string | null>(null);
const ticketFilter = ref<'ALL' | TicketStatus>('ALL');

const isAdmin = computed(() => role.value === 'ADMIN_SISTEM');

function fillForm(l: Landing) {
  form.hero_title = l.hero_title;
  form.hero_subtitle = l.hero_subtitle;
  form.promo_banner = l.promo_banner;
}

async function load(keepForm = false) {
  if (!isAdmin.value) return;
  loadError.value = null;
  try {
    const [p, low, fo, t, l] = await Promise.all([
      data<Product[]>('/api/catalog/products'),
      data<Product[]>('/api/catalog/products', { query: { maxStock: LOW_STOCK } }),
      data<Order[]>('/api/orders', { query: { status: 'FAILED' } }),
      data<Ticket[]>('/api/tickets'),
      data<Landing>('/api/catalog/landing'),
    ]);
    products.value = p;
    lowStock.value = low;
    failedOrders.value = fo;
    tickets.value = t;
    landing.value = l;
    if (!keepForm || !form.hero_title) fillForm(l);
    for (const x of low) restockQty[x.id] ??= 10;
  } catch (e: any) {
    loadError.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(() => load());
watch(() => user.value?.id, () => load());
watch(version, () => load(true));

const dirty = computed(
  () =>
    !!landing.value &&
    (form.hero_title !== landing.value.hero_title ||
      form.hero_subtitle !== landing.value.hero_subtitle ||
      form.promo_banner !== landing.value.promo_banner)
);

/** PATCH /api/catalog/landing */
async function saveLanding() {
  saving.value = true;
  try {
    const res = await request<{ data: Landing; message: string }>('/api/catalog/landing', {
      method: 'PATCH',
      body: { ...form },
    });
    landing.value = res.data;
    fillForm(res.data);
    success(res.message);
  } catch (e: any) {
    error(e.message);
  } finally {
    saving.value = false;
  }
}

/** PATCH /api/catalog/products/:id/stock { delta } */
async function restock(p: Product) {
  const delta = Math.max(1, Math.floor(restockQty[p.id] ?? 0));
  restocking.value = p.id;
  try {
    const res = await request<{ data: Product; message: string }>(`/api/catalog/products/${p.id}/stock`, {
      method: 'PATCH',
      body: { delta },
    });
    success(`${p.id} +${delta} → stok sekarang ${res.data.stock}`);
    bump();
  } catch (e: any) {
    error(e.message);
  } finally {
    restocking.value = null;
  }
}

/** PATCH /api/tickets/:id/escalate { note } */
async function escalate(t: Ticket) {
  escalating.value = t.id;
  try {
    const res = await request<{ message: string }>(`/api/tickets/${t.id}/escalate`, {
      method: 'PATCH',
      body: { note: escalateNote[t.id]?.trim() || undefined },
    });
    success(res.message);
    escalateNote[t.id] = '';
    bump();
  } catch (e: any) {
    error(e.message);
  } finally {
    escalating.value = null;
  }
}

const countBy = (s: TicketStatus) => tickets.value.filter((t) => t.status === s).length;
const visibleTickets = computed(() =>
  ticketFilter.value === 'ALL' ? tickets.value : tickets.value.filter((t) => t.status === ticketFilter.value)
);
const ticketByOrder = computed(() => new Map(tickets.value.filter((t) => t.order_id).map((t) => [t.order_id!, t])));
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).join(' · ') || '—';
</script>

<template>
  <RoleGate :roles="['ADMIN_SISTEM']" title="Dashboard Operasional">
    <div class="mx-auto flex max-w-page flex-col gap-6 px-4 pb-12 pt-10 lg:px-10">
      <!-- header -->
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex flex-col gap-1.5">
          <span class="text-[11px] font-bold tracking-[0.1em] text-indigo-500">ADMIN SISTEM · OPERASIONAL</span>
          <h1 class="text-[32px] font-extrabold tracking-tight text-white">Dashboard Operasional</h1>
          <p class="text-sm text-zinc-400">Halo {{ user ? firstName(user) : '' }} — pantau landing page, stok, dan tiket helpdesk dari satu tempat.</p>
        </div>
        <UiButton variant="ghost" :loading="loading" @click="load()">⟳ Refresh</UiButton>
      </div>

      <div v-if="loadError" class="rounded-xl border border-red-900 bg-red-950 p-4 text-sm text-red-300">{{ loadError }}</div>

      <!-- KPI -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard label="Total Produk" :value="products.length" meta="catalog.products" />
        <KpiCard :label="`Stok Menipis (<= ${LOW_STOCK})`" :value="lowStock.length" :meta="ids(lowStock)" color="text-orange-400" />
        <KpiCard label="Order FAILED" :value="failedOrders.length" :meta="ids(failedOrders)" color="text-red-400" />
        <KpiCard label="Tiket OPEN" :value="countBy('OPEN')" :meta="ids(tickets.filter((t) => t.status === 'OPEN'))" color="text-blue-400" />
        <KpiCard label="Tiket ESCALATED" :value="countBy('ESCALATED')" :meta="ids(tickets.filter((t) => t.status === 'ESCALATED'))" color="text-purple-400" />
      </div>

      <div class="grid items-start gap-6 lg:grid-cols-[1fr_440px]">
        <!-- LEFT -->
        <div class="flex min-w-0 flex-col gap-6">
          <!-- Landing page -->
          <AdminPanel title="Manajemen Landing Page" subtitle="Ubah konten hero & promo banner storefront" hint="PATCH /api/catalog/landing">
            <form class="flex flex-col gap-4" @submit.prevent="saveLanding">
              <div class="grid gap-4 md:grid-cols-2">
                <label class="flex flex-col gap-2">
                  <span class="flex justify-between text-xs font-semibold text-zinc-300">Hero Title <span class="font-mono text-[10px] font-normal text-zinc-500">hero_title</span></span>
                  <input v-model="form.hero_title" required class="field-input" />
                </label>
                <label class="flex flex-col gap-2">
                  <span class="flex justify-between text-xs font-semibold text-zinc-300">Promo Banner <span class="font-mono text-[10px] font-normal text-zinc-500">promo_banner</span></span>
                  <input v-model="form.promo_banner" required class="field-input" />
                </label>
              </div>
              <label class="flex flex-col gap-2">
                <span class="flex justify-between text-xs font-semibold text-zinc-300">Hero Subtitle <span class="font-mono text-[10px] font-normal text-zinc-500">hero_subtitle</span></span>
                <textarea v-model="form.hero_subtitle" required rows="3" class="field-input resize-none" />
              </label>
              <div class="flex flex-wrap items-center gap-3">
                <div class="flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] border border-indigo-800 bg-indigo-950 px-3 py-2.5">
                  <span class="text-[9px] font-extrabold tracking-widest text-indigo-300">PREVIEW</span>
                  <span class="truncate text-xs font-medium text-indigo-100">{{ form.hero_title }} · {{ form.promo_banner }}</span>
                </div>
                <UiButton variant="ghost" :disabled="!dirty" @click="landing && fillForm(landing)">Reset</UiButton>
                <UiButton type="submit" variant="dark-primary" :loading="saving" :disabled="!dirty">Simpan Perubahan</UiButton>
              </div>
            </form>
          </AdminPanel>

          <!-- Failed orders -->
          <AdminPanel title="Order Bermasalah (FAILED)" subtitle="Transaksi gagal yang berpotensi jadi komplain" hint="GET /api/orders?status=FAILED">
            <p v-if="!failedOrders.length" class="text-sm text-zinc-500">Tidak ada order FAILED. 🎉</p>
            <div v-for="o in failedOrders" :key="o.id" class="flex flex-wrap items-center gap-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3.5">
              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-mono text-[13px] font-bold text-white">{{ o.id }}</span>
                  <span class="text-[11px] text-zinc-500">{{ o.user_id }} · {{ formatDate(o.created_at) }}</span>
                </div>
                <span class="text-[13px] font-semibold text-zinc-200">{{ o.product_name }} ×{{ o.quantity }} — {{ rupiah(o.total_price) }}</span>
                <span class="break-words font-mono text-[11px] text-red-400">{{ o.payment_note }}</span>
              </div>
              <div class="flex flex-col items-end gap-2">
                <StatusBadge status="FAILED" theme="dark" />
                <span v-if="ticketByOrder.get(o.id)" class="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  {{ ticketByOrder.get(o.id)!.id }} <StatusBadge :status="ticketByOrder.get(o.id)!.status" theme="dark" />
                </span>
                <span v-else class="text-[11px] text-zinc-500">belum ada tiket</span>
              </div>
            </div>
          </AdminPanel>

          <!-- Ticket inbox -->
          <AdminPanel title="Inbox Tiket Helpdesk" :subtitle="`${tickets.length} tiket · urut created_at DESC`" hint="GET /api/tickets" flush>
            <div class="flex flex-wrap gap-2 px-5 py-3.5">
              <button
                v-for="f in (['ALL', 'OPEN', 'ESCALATED', 'RESOLVED'] as const)"
                :key="f"
                class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                :class="ticketFilter === f ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'"
                @click="ticketFilter = f"
              >
                {{ f === 'ALL' ? 'Semua' : f }}
                <span class="text-[11px] font-bold text-zinc-500">{{ f === 'ALL' ? tickets.length : countBy(f) }}</span>
              </button>
            </div>

            <div class="hidden grid-cols-[80px_1fr_130px_120px_200px] gap-4 bg-zinc-950 px-5 py-2.5 text-[10px] font-bold tracking-[0.08em] text-zinc-500 md:grid">
              <span>ID</span><span>SUBJEK & DESKRIPSI</span><span>KATEGORI</span><span>STATUS</span><span>AKSI</span>
            </div>

            <p v-if="!visibleTickets.length" class="px-5 py-6 text-sm text-zinc-500">Tidak ada tiket.</p>

            <div
              v-for="t in visibleTickets"
              :key="t.id"
              class="flex flex-col gap-3.5 border-t border-zinc-800 px-5 py-[18px]"
              :class="t.status === 'OPEN' ? 'bg-gray-900' : ''"
            >
              <div class="grid gap-4 md:grid-cols-[80px_1fr_130px_120px_200px]">
                <div class="flex flex-col gap-1">
                  <span class="font-mono text-[13px] font-bold text-white">{{ t.id }}</span>
                  <span class="font-mono text-[10px] text-zinc-500">{{ t.user_id }}</span>
                </div>
                <div class="flex min-w-0 flex-col gap-1">
                  <span class="text-sm font-bold text-zinc-50">{{ t.subject }}</span>
                  <span class="text-xs text-zinc-400">{{ t.description }}</span>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[11px] text-zinc-500">{{ formatDate(t.created_at) }}</span>
                    <span v-if="t.order_id" class="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-300">↗ {{ t.order_id }}</span>
                  </div>
                </div>
                <div><StatusBadge :status="t.category" theme="dark" /></div>
                <div><StatusBadge :status="t.status" theme="dark" /></div>
                <div class="flex flex-col gap-2">
                  <UiButton v-if="t.status === 'OPEN'" variant="dark-primary" block :loading="escalating === t.id" @click="escalate(t)">⇪ Eskalasi ke Developer</UiButton>
                  <UiButton v-else-if="t.status === 'ESCALATED'" variant="ghost" block disabled>✓ Sudah di antrean Dev</UiButton>
                  <UiButton v-else variant="ghost" block disabled>✓ Resolved</UiButton>
                </div>
              </div>

              <template v-if="t.status === 'OPEN'">
                <label class="flex items-center gap-2.5 rounded-[10px] border border-dashed border-zinc-700 bg-zinc-950 px-3 py-2">
                  <span class="font-mono text-[11px] font-bold text-indigo-400">note →</span>
                  <input
                    v-model="escalateNote[t.id]"
                    class="flex-1 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-500"
                    :placeholder="t.order_id ? `Catatan teknis untuk developer, mis. &quot;Cek callback payment gateway untuk ${t.order_id}&quot;` : 'Catatan teknis untuk developer (opsional)'"
                  />
                </label>
                <span class="api-hint text-zinc-600">PATCH /api/tickets/{{ t.id }}/escalate { note }</span>
              </template>
              <template v-else>
                <div v-if="t.dev_note" class="flex items-start gap-2.5 rounded-[10px] bg-purple-950 px-3 py-2.5">
                  <span class="shrink-0 font-mono text-[11px] font-bold text-purple-400">dev_note</span>
                  <span class="text-xs text-purple-100">{{ t.dev_note }}</span>
                  <span class="ml-auto shrink-0 text-[10px] text-purple-400/70">internal</span>
                </div>
                <div v-if="t.status === 'RESOLVED'" class="flex items-start gap-2.5 rounded-[10px] bg-emerald-950 px-3 py-2.5">
                  <span class="shrink-0 font-mono text-[11px] font-bold text-emerald-400">resolution_note</span>
                  <span class="text-xs text-emerald-100">{{ t.resolution_note || '—' }}</span>
                  <span class="ml-auto shrink-0 text-[10px] text-emerald-400/70">dilihat customer</span>
                </div>
              </template>
            </div>
          </AdminPanel>
        </div>

        <!-- RIGHT -->
        <div class="flex flex-col gap-6">
          <AdminPanel :title="`Alert Stok Menipis (<= ${LOW_STOCK})`" :subtitle="`${lowStock.length} produk perlu restock segera`" :hint="`maxStock=${LOW_STOCK}`">
            <p v-if="!lowStock.length" class="text-sm text-zinc-500">Semua stok aman. ✓</p>
            <div v-for="p in lowStock" :key="p.id" class="flex flex-col gap-3 rounded-xl border border-orange-900 bg-[#1C1310] p-4">
              <div class="flex items-center gap-3">
                <div class="flex h-[52px] w-[52px] shrink-0 flex-col items-center justify-center rounded-xl bg-orange-950">
                  <span class="text-xl font-extrabold leading-none text-orange-400">{{ p.stock }}</span>
                  <span class="text-[9px] font-semibold text-orange-300">left</span>
                </div>
                <div class="flex min-w-0 flex-col gap-0.5">
                  <span class="font-mono text-[11px] font-semibold text-zinc-400">{{ p.id }}</span>
                  <span class="text-sm font-bold text-zinc-50">{{ p.name }}</span>
                  <span class="text-xs font-medium text-zinc-400">{{ rupiah(p.price) }} · stock: {{ p.stock }}</span>
                </div>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div class="h-full rounded-full bg-orange-600" :style="{ width: `${Math.max(4, (p.stock / 25) * 100)}%` }" />
              </div>
              <div class="flex items-center gap-2">
                <div class="flex items-center rounded-lg border border-zinc-700 bg-zinc-950">
                  <button class="h-[38px] w-8 font-bold text-zinc-200" @click="restockQty[p.id] = Math.max(1, (restockQty[p.id] ?? 10) - 1)">−</button>
                  <input v-model.number="restockQty[p.id]" type="number" min="1" class="h-[38px] w-11 bg-transparent text-center text-[13px] font-bold text-zinc-200 outline-none" />
                  <button class="h-[38px] w-8 font-bold text-zinc-200" @click="restockQty[p.id] = (restockQty[p.id] ?? 10) + 1">+</button>
                </div>
                <UiButton variant="success" class="flex-1" :loading="restocking === p.id" @click="restock(p)">+ Restock</UiButton>
              </div>
            </div>
            <span class="api-hint text-zinc-500">PATCH /api/catalog/products/:id/stock { delta }</span>
          </AdminPanel>
        </div>
      </div>
    </div>
  </RoleGate>
</template>
