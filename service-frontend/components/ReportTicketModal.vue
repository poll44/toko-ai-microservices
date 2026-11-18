<script setup lang="ts">
import type { Order, Ticket, TicketCategory } from '~/types';

/** POST /api/tickets (CUSTOMER) — { order_id, category, subject, description } */
const props = defineProps<{ order: Order | null }>();
const emit = defineEmits<{ close: []; created: [ticket: Ticket] }>();

const { request } = useApi();
const { error } = useToast();

const form = reactive({ category: 'PAYMENT_ISSUE' as TicketCategory, subject: '', description: '' });
const saving = ref(false);

watch(
  () => props.order,
  (o) => {
    if (!o) return;
    const failed = o.status === 'FAILED';
    form.category = failed || o.status === 'PENDING' ? 'PAYMENT_ISSUE' : 'GENERAL';
    form.subject = failed ? 'Pembayaran gagal tapi saldo terpotong' : `Kendala pada pesanan ${o.id}`;
    form.description = `Pesanan ${o.id} (${o.product_name} ×${o.quantity}, ${rupiah(o.total_price)}) berstatus ${o.status}.${o.payment_note ? ` Catatan: ${o.payment_note}.` : ''} `;
  },
  { immediate: true }
);

async function submit() {
  if (!props.order) return;
  saving.value = true;
  try {
    const res = await request<{ data: Ticket; message: string }>('/api/tickets', {
      method: 'POST',
      body: { order_id: props.order.id, category: form.category, subject: form.subject, description: form.description },
    });
    emit('created', res.data);
  } catch (e: any) {
    error(e.message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div v-if="order" class="fixed inset-0 z-[55] grid place-items-center bg-zinc-950/50 p-4 backdrop-blur-sm" @click.self="emit('close')">
    <form class="flex w-full max-w-lg flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl" @submit.prevent="submit">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-extrabold text-zinc-950">Laporkan Masalah</h2>
          <p class="text-sm text-zinc-500">Tiket akan masuk ke Inbox Helpdesk Admin Sistem.</p>
        </div>
        <span class="rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-bold text-zinc-700">{{ order.id }}</span>
      </div>

      <label class="flex flex-col gap-2">
        <span class="text-xs font-semibold text-zinc-700">Kategori <span class="font-mono font-normal text-zinc-400">category</span></span>
        <select v-model="form.category" class="field-input-light">
          <option value="PAYMENT_ISSUE">PAYMENT_ISSUE — Masalah pembayaran</option>
          <option value="BUG_UI">BUG_UI — Tampilan / tombol bermasalah</option>
          <option value="GENERAL">GENERAL — Lainnya</option>
        </select>
      </label>
      <label class="flex flex-col gap-2">
        <span class="text-xs font-semibold text-zinc-700">Judul <span class="font-mono font-normal text-zinc-400">subject</span></span>
        <input v-model="form.subject" required class="field-input-light" />
      </label>
      <label class="flex flex-col gap-2">
        <span class="text-xs font-semibold text-zinc-700">Deskripsi <span class="font-mono font-normal text-zinc-400">description</span></span>
        <textarea v-model="form.description" required rows="4" class="field-input-light resize-none" />
      </label>

      <div class="flex items-center justify-between gap-3">
        <span class="api-hint">POST /api/tickets</span>
        <div class="flex gap-2">
          <UiButton variant="secondary" @click="emit('close')">Batal</UiButton>
          <UiButton type="submit" :loading="saving">Kirim Laporan</UiButton>
        </div>
      </div>
    </form>
  </div>
</template>
