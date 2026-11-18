<script setup lang="ts">
/** Floating AI Assistant Widget — service-agent (ADK) via gateway /api/agent */
const { user, role } = useAuth();
const { messages, busy, open, send, reset } = useAgent();

const draft = ref('');
const scroller = ref<HTMLElement | null>(null);

const chips = computed(() => QUICK_PROMPTS[role.value]);
const roleTag = computed(() => (user.value ? `${role.value} · ${user.value.id}` : 'GUEST'));

// Ganti role => mulai percakapan baru dengan identitas baru
watch(() => user.value?.id, () => reset());

watch(
  () => [messages.value.length, busy.value, open.value],
  async () => {
    await nextTick();
    scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' });
  }
);

function submit(text?: string) {
  const t = text ?? draft.value;
  if (!t.trim()) return;
  draft.value = '';
  send(t);
}
</script>

<template>
  <div class="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-3 sm:right-8">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-3 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-3 opacity-0"
    >
      <section
        v-if="open"
        class="flex max-h-[min(760px,calc(100vh-120px))] w-[min(400px,calc(100vw-32px))] flex-col overflow-hidden rounded-[20px] border border-zinc-700 bg-zinc-900 shadow-[0_16px_40px_rgba(0,0,0,0.28)]"
      >
        <!-- header -->
        <header class="flex items-center justify-between gap-2.5 bg-gradient-to-br from-indigo-900 to-zinc-900 px-4 py-3.5">
          <div class="flex items-center gap-2.5">
            <span class="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-[13px] font-extrabold text-white">AI</span>
            <div>
              <p class="text-sm font-bold text-white">TokoAI Assistant</p>
              <p class="text-[10px] font-medium text-green-400">● online · toko_orchestrator_agent · MCP SSE :5000</p>
            </div>
          </div>
          <div class="flex gap-1">
            <button class="grid h-7 w-7 place-items-center rounded-lg bg-zinc-800 text-xs font-bold text-zinc-400 hover:text-white" title="Mulai ulang percakapan" @click="reset">⟳</button>
            <button class="grid h-7 w-7 place-items-center rounded-lg bg-zinc-800 text-xs font-bold text-zinc-400 hover:text-white" title="Tutup" @click="open = false">✕</button>
          </div>
        </header>

        <!-- role aktif -->
        <div class="flex items-center gap-2 bg-zinc-950 px-4 py-2.5">
          <span class="text-[11px] font-medium text-zinc-400">Role aktif</span>
          <span class="flex items-center gap-1.5 rounded-full border bg-zinc-800 py-1 pl-1 pr-2.5" :class="ROLE_META[role].ring">
            <span class="grid h-[18px] w-[18px] place-items-center rounded-full text-[9px] font-bold text-white" :class="ROLE_META[role].avatar">{{ initialOf(user) }}</span>
            <span class="font-mono text-[11px] font-bold text-white">{{ roleTag }}</span>
          </span>
        </div>

        <!-- messages -->
        <div ref="scroller" class="thin-scroll flex min-h-[200px] flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-2 pt-4">
          <p v-if="!messages.length" class="rounded-xl border border-dashed border-zinc-700 p-3 text-[12px] leading-relaxed text-zinc-400">
            Halo{{ user ? ` ${firstName(user)}` : '' }}! Saya terhubung ke service Catalog, Order & Ticket lewat MCP tools.
            Pilih quick prompt di bawah atau ketik pertanyaanmu.
          </p>
          <ChatBubble v-for="m in messages" :key="m.id" :message="m" />
          <div v-if="busy" class="flex items-center gap-2 text-[12px] text-zinc-400">
            <span class="flex gap-1">
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:120ms]" />
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:240ms]" />
            </span>
            Agent sedang memproses…
          </div>
        </div>

        <!-- quick prompts -->
        <div class="flex flex-col gap-2 px-4 pb-3 pt-2">
          <span class="text-[9px] font-bold tracking-[0.08em] text-zinc-500">QUICK PROMPT</span>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="c in chips"
              :key="c"
              :disabled="busy"
              class="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-indigo-500 hover:text-white disabled:opacity-50"
              @click="submit(c)"
            >
              {{ c }}
            </button>
          </div>
        </div>

        <!-- composer -->
        <form class="flex items-center gap-2 px-4 pb-4 pt-3" @submit.prevent="submit()">
          <input v-model="draft" class="field-input flex-1 rounded-xl" placeholder="Ketik pesan untuk asisten…" :disabled="busy" />
          <button type="submit" :disabled="busy || !draft.trim()" class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-500 text-white transition hover:bg-indigo-400 disabled:opacity-50">
            ➤
          </button>
        </form>
      </section>
    </Transition>

    <button
      class="grid h-[60px] w-[60px] place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-lg font-extrabold text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition hover:scale-105"
      :title="open ? 'Sembunyikan asisten' : 'Buka TokoAI Assistant'"
      @click="open = !open"
    >
      {{ open ? '✕' : 'AI' }}
    </button>
  </div>
</template>
