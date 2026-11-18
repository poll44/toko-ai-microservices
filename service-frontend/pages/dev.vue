<script setup lang="ts">
import type { Order, Ticket } from '~/types';

/** Board 03 - Antrean Bug & Eskalasi (ADMIN_DEV) */
const { data, request } = useApi();
const { user, role } = useAuth();
const { version, bump } = useDataVersion();
const { success, error } = useToast();
const agent = useAgent();

const escalated = ref<Ticket[]>([]);
const resolved = ref<Ticket[]>([]);
const orders = ref<Record<string, Order>>({});
const notes = reactive<Record<string, string>>({});
const resolving = ref<string | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);

const isDev = computed(() => role.value === 'ADMIN_DEV');

async function load() {
  if (!isDev.value) return;
  loadError.value = null;
  try {
    const [esc, res] = await Promise.all([
      data<Ticket[]>('/api/tickets', { query: { status: 'ESCALATED' } }),
      data<Ticket[]>('/api/tickets', { query: { status: 'RESOLVED' } }),
    ]);
    escalated.value = esc;
    resolved.value = res;
    // Konteks order terkait: GET /api/orders/:id
    const ids = [...new Set(esc.map((t) => t.order_id).filter((x): x is string => !!x))];
    const fetched = await Promise.all(ids.map((id) => data<Order>(`/api/orders/${id}`).catch(() => null)));
    orders.value = Object.fromEntries(fetched.filter((o): o is Order => !!o).map((o) => [o.id, o]));
  } catch (e: any) {
    loadError.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch([() => user.value?.id, version], load);

/** PATCH /api/tickets/:id/resolve { resolution_note } — dev_note akan ditimpa */
async function resolve(t: Ticket) {
  const note = notes[t.id]?.trim();
  if (!note) return;
  resolving.value = t.id;
  try {
    const res = await request<{ message: string }>(`/api/tickets/${t.id}/resolve`, {
      method: 'PATCH',
      body: { resolution_note: note },
    });
    success(res.message);
    notes[t.id] = '';
    bump();
  } catch (e: any) {
    error(e.message);
  } finally {
    resolving.value = null;
  }
}

function askAgent(t: Ticket) {
  agent.send(
    t.order_id
      ? `Bantu investigasi tiket ${t.id}: cek detail order ${t.order_id} dan rangkum kemungkinan penyebab teknisnya.`
      : `Bantu rangkum tiket ${t.id} (${t.subject}) dan sarankan langkah investigasi teknis.`
  );
}

/** Template penjelasan customer-facing untuk kasus yang sering terjadi */
function templatesFor(t: Ticket): { label: string; text: string }[] {
  const ord = t.order_id ? `pesanan ${t.order_id}` : 'pesanan Anda';
  const list = [
    {
      label: 'Timeout pembayaran',
      text: `Pembayaran untuk ${ord} gagal karena tidak diselesaikan dalam batas waktu pembayaran yang telah ditentukan, sehingga order otomatis dibatalkan oleh sistem. Tidak ada dana yang ditagihkan untuk order ini. Jika masih berminat, silakan klik "Pesan Ulang" dan selesaikan pembayaran sebelum batas waktu berakhir.`,
    },
    {
      label: 'Callback gateway gagal',
      text: `Kami menemukan pembayaran untuk ${ord} sebenarnya sudah diterima, namun konfirmasi dari payment gateway gagal terkirim ke sistem kami. Dana Anda akan dikembalikan penuh ke metode pembayaran semula dalam 1–3 hari kerja. Mohon maaf atas ketidaknyamanannya.`,
    },
    {
      label: 'Bug tampilan diperbaiki',
      text: 'Terima kasih atas laporannya. Masalah tampilan yang Anda alami sudah kami perbaiki. Silakan muat ulang halaman; bila masih terjadi, laporkan kembali melalui tombol "Laporkan Masalah".',
    },
  ];
  return t.category === 'BUG_UI' ? [list[2]!, list[0]!, list[1]!] : list;
}

const count = (c: string) => escalated.value.filter((t) => t.category === c).length;
const PRIORITY: Record<string, { label: string; cls: string }> = {
  PAYMENT_ISSUE: { label: 'P1 · Payment', cls: 'bg-red-950 text-red-400' },
  BUG_UI: { label: 'P2 · UI', cls: 'bg-zinc-800 text-zinc-300' },
  GENERAL: { label: 'P3 · General', cls: 'bg-zinc-800 text-zinc-400' },
};
</script>

<template>
  <RoleGate :roles="['ADMIN_DEV']" title="Antrean Bug & Eskalasi">
    <div class="mx-auto flex max-w-page flex-col gap-6 px-4 pb-12 pt-10 lg:px-10">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex flex-col gap-1.5">
          <span class="text-[11px] font-bold tracking-[0.1em] text-purple-400">ADMIN DEV · ENGINEERING QUEUE</span>
          <h1 class="text-[32px] font-extrabold tracking-tight text-white">Antrean Bug & Eskalasi</h1>
          <p class="text-sm text-zinc-400">Halo {{ user ? firstName(user) : '' }} — tiket berstatus ESCALATED dari Admin Sistem menunggu investigasi teknis.</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="api-hint hidden text-zinc-500 md:inline">GET /api/tickets?status=ESCALATED</span>
          <UiButton variant="ghost" :loading="loading" @click="load">⟳ Refresh</UiButton>
        </div>
      </div>

      <div v-if="loadError" class="rounded-xl border border-red-900 bg-red-950 p-4 text-sm text-red-300">{{ loadError }}</div>

      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard mono label="ESCALATED" :value="escalated.length" :meta="escalated.map((t) => t.id).join(' · ') || '—'" color="text-purple-400" />
        <KpiCard mono label="BUG_UI" :value="count('BUG_UI')" color="text-zinc-100" />
        <KpiCard mono label="PAYMENT_ISSUE" :value="count('PAYMENT_ISSUE')" color="text-red-400" />
        <KpiCard mono label="RESOLVED" :value="resolved.length" :meta="resolved.map((t) => t.id).join(' · ') || 'belum ada'" color="text-emerald-400" />
      </div>

      <div class="grid items-start gap-6 lg:grid-cols-[1fr_440px]">
        <div class="flex min-w-0 flex-col gap-6">
          <AdminPanel title="Alur Status Tiket" subtitle="Lifecycle di service-ticket">
            <div class="flex flex-wrap items-center gap-2">
              <template v-for="(s, i) in [['OPEN', 'CUSTOMER'], ['ESCALATED', 'ADMIN_SISTEM'], ['RESOLVED', 'ADMIN_DEV']]" :key="s[0]">
                <div class="flex flex-col items-center gap-1.5">
                  <StatusBadge :status="s[0]!" theme="dark" />
                  <span class="font-mono text-[9px] font-semibold text-zinc-500">{{ s[1] }}</span>
                </div>
                <span v-if="i < 2" class="pb-4 font-bold text-zinc-600">→</span>
              </template>
            </div>
          </AdminPanel>

          <div v-if="!loading && !escalated.length" class="rounded-2xl border border-dashed border-zinc-700 p-10 text-center">
            <p class="text-lg font-bold text-zinc-200">Antrean kosong 🎉</p>
            <p class="text-sm text-zinc-500">Tidak ada tiket ESCALATED. Tiket baru muncul setelah Admin Sistem melakukan eskalasi.</p>
          </div>

          <article v-for="t in escalated" :key="t.id" class="flex flex-col gap-4 rounded-2xl border border-purple-900 bg-zinc-900 p-6">
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="font-mono text-[15px] font-extrabold text-white">{{ t.id }}</span>
              <StatusBadge status="ESCALATED" theme="dark" />
              <StatusBadge :status="t.category" theme="dark" />
              <span class="rounded-md px-2 py-0.5 text-[10px] font-bold" :class="(PRIORITY[t.category] ?? PRIORITY.GENERAL)!.cls">{{ (PRIORITY[t.category] ?? PRIORITY.GENERAL)!.label }}</span>
              <span class="flex-1" />
              <span class="font-mono text-[11px] text-zinc-500">{{ t.user_id }} · {{ formatDate(t.created_at) }}</span>
            </div>

            <div class="flex flex-col gap-2">
              <h2 class="text-lg font-bold text-zinc-50">{{ t.subject }}</h2>
              <p class="text-[13px] leading-relaxed text-zinc-400">{{ t.description }}</p>
            </div>

            <div class="grid gap-3 md:grid-cols-[1fr_300px]">
              <div class="flex flex-col gap-1.5 rounded-[10px] border border-purple-800 bg-purple-950 px-3.5 py-3">
                <span class="text-[10px] font-bold tracking-[0.06em] text-purple-400">CATATAN ADMIN SISTEM · dev_note</span>
                <span class="text-[13px] text-purple-50">{{ t.dev_note || '—' }}</span>
              </div>
              <div class="flex flex-col gap-1.5 rounded-[10px] border border-zinc-800 bg-zinc-950 px-3.5 py-3">
                <span class="text-[10px] font-bold tracking-[0.06em] text-zinc-500">KONTEKS TERKAIT</span>
                <template v-if="t.order_id && orders[t.order_id]">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold text-white">{{ t.order_id }}</span>
                    <StatusBadge :status="orders[t.order_id]!.status" theme="dark" />
                  </div>
                  <span class="text-[11px] text-zinc-300">{{ orders[t.order_id]!.product_name }} ×{{ orders[t.order_id]!.quantity }} · {{ rupiah(orders[t.order_id]!.total_price) }}</span>
                  <span class="break-words font-mono text-[11px] text-red-400">{{ orders[t.order_id]!.payment_note }}</span>
                </template>
                <span v-else-if="t.order_id" class="font-mono text-xs text-zinc-400">{{ t.order_id }} (detail tidak ditemukan)</span>
                <span v-else class="text-xs text-zinc-400">Tidak ada order_id terkait.</span>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <span class="flex justify-between text-xs font-semibold text-zinc-300">
                Penjelasan untuk Customer
                <span class="font-mono text-[10px] font-normal text-zinc-500">resolution_note</span>
              </span>
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-[10px] font-bold tracking-[0.06em] text-zinc-500">TEMPLATE</span>
                <button
                  v-for="tpl in templatesFor(t)"
                  :key="tpl.label"
                  type="button"
                  class="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:border-indigo-500"
                  @click="notes[t.id] = tpl.text"
                >
                  {{ tpl.label }}
                </button>
              </div>
              <textarea
                v-model="notes[t.id]"
                rows="3"
                class="field-input resize-none"
                placeholder="Jelaskan ke customer apa penyebabnya & langkah selanjutnya (bahasa non-teknis)…"
              />
              <div v-if="notes[t.id]?.trim()" class="flex flex-col gap-1 rounded-[10px] border border-emerald-900 bg-emerald-950/40 px-3 py-2.5">
                <span class="text-[10px] font-bold tracking-[0.06em] text-emerald-400">PREVIEW DI HALAMAN "PESANAN SAYA" CUSTOMER ({{ t.user_id }})</span>
                <span class="text-[13px] text-emerald-50">💬 {{ notes[t.id] }}</span>
              </div>
              <span class="text-[11px] text-zinc-500">
                Teks ini akan dibaca customer. Catatan internal (dev_note) tetap tersimpan & tidak ditampilkan ke customer.
                <span class="font-mono">PATCH /api/tickets/{{ t.id }}/resolve</span>
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <UiButton variant="ghost" @click="askAgent(t)">✦ Investigasi dengan AI</UiButton>
              <span class="flex-1" />
              <UiButton variant="success" :loading="resolving === t.id" :disabled="!notes[t.id]?.trim()" @click="resolve(t)">✓ Tandai Resolved</UiButton>
            </div>
          </article>
        </div>

        <div class="flex flex-col gap-6">
          <AdminPanel title="Baru Diselesaikan" subtitle="status = RESOLVED" hint="?status=RESOLVED">
            <div v-if="!resolved.length" class="flex flex-col items-center gap-1.5 rounded-[10px] border border-dashed border-zinc-700 px-4 py-5 text-center">
              <span class="text-2xl font-extrabold text-zinc-600">✓</span>
              <span class="text-[13px] font-semibold text-zinc-300">Belum ada tiket RESOLVED</span>
              <span class="text-[11px] text-zinc-500">Tiket yang kamu tandai selesai akan muncul di sini.</span>
            </div>
            <div v-for="t in resolved" :key="t.id" class="flex flex-col gap-1.5 rounded-[10px] border border-emerald-900 bg-emerald-950/40 px-3.5 py-3">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-white">{{ t.id }}</span>
                <StatusBadge status="RESOLVED" theme="dark" />
                <StatusBadge :status="t.category" theme="dark" />
              </div>
              <span class="text-[13px] font-semibold text-zinc-200">{{ t.subject }}</span>
              <span class="text-[11px] text-emerald-200">💬 {{ t.resolution_note || '—' }}</span>
              <span v-if="t.resolved_at" class="text-[10px] text-zinc-500">{{ formatDate(t.resolved_at) }}</span>
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  </RoleGate>
</template>
