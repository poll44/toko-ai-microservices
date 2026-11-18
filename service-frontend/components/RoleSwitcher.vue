<script setup lang="ts">
import type { User } from '~/types';

/** Quick Role Switcher — GET /auth/demo-users + POST /auth/login */
const props = defineProps<{ dark?: boolean }>();

const { user, role, demoUsers, switching, loadDemoUsers, loginAs, logout } = useAuth();
const { error, success } = useToast();
const router = useRouter();

const open = ref(false);
const root = ref<HTMLElement | null>(null);
const loadError = ref<string | null>(null);

async function toggle() {
  open.value = !open.value;
  if (open.value) {
    loadError.value = null;
    try {
      await loadDemoUsers();
    } catch (e: any) {
      loadError.value = 'Gateway tidak dapat dihubungi (:8080)';
    }
  }
}

async function choose(u: User | null) {
  open.value = false;
  try {
    if (!u) {
      logout();
      success('Kamu sekarang Guest');
      router.push('/');
      return;
    }
    if (u.id === user.value?.id) return;
    await loginAs(u.email);
    success(`Login sebagai ${roleLabel(u)}`);
    router.push(ROLE_META[u.role].home);
  } catch (e: any) {
    error(e.message);
  }
}

function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false;
}
onMounted(() => document.addEventListener('click', onDocClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocClick));

const t = computed(() =>
  props.dark
    ? { pill: 'bg-zinc-900 border-zinc-700', fg: 'text-zinc-50', mut: 'text-zinc-400', menu: 'bg-zinc-900 border-zinc-700', item: 'hover:bg-zinc-800', act: 'bg-zinc-800' }
    : { pill: 'bg-white border-zinc-200', fg: 'text-zinc-950', mut: 'text-zinc-500', menu: 'bg-white border-zinc-200', item: 'hover:bg-zinc-50', act: 'bg-indigo-50' }
);
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-3 transition"
      :class="t.pill"
      @click="toggle"
    >
      <span class="grid h-[30px] w-[30px] place-items-center rounded-full text-[13px] font-bold text-white" :class="ROLE_META[role].avatar">
        {{ initialOf(user) }}
      </span>
      <span class="hidden flex-col items-start text-left sm:flex">
        <span class="text-[9px] font-bold tracking-[0.08em]" :class="t.mut">LOGIN SEBAGAI</span>
        <span class="text-[13px] font-bold" :class="t.fg">{{ roleLabel(user) }}</span>
      </span>
      <svg v-if="switching" class="h-4 w-4 animate-spin" :class="t.mut" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity=".25" stroke-width="4" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="4" />
      </svg>
      <span v-else class="text-sm font-bold" :class="t.mut">▾</span>
    </button>

    <div v-if="open" class="absolute right-0 top-[calc(100%+8px)] z-50 w-80 rounded-[14px] border p-2 shadow-2xl" :class="t.menu">
      <p class="px-2.5 py-1.5 text-[9px] font-bold tracking-[0.06em] text-zinc-400">
        QUICK ROLE SWITCHER · <span class="font-mono">GET /auth/demo-users</span>
      </p>
      <p v-if="loadError" class="px-2.5 py-2 text-xs text-red-500">{{ loadError }}</p>

      <button type="button" class="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left" :class="[t.item, role === 'GUEST' ? t.act : '']" @click="choose(null)">
        <span class="grid h-7 w-7 place-items-center rounded-full bg-zinc-500 text-xs font-bold text-white">G</span>
        <span class="flex flex-1 flex-col">
          <span class="text-[13px] font-bold" :class="t.fg">Guest</span>
          <span class="font-mono text-[10px] text-zinc-400">GUEST · Tanpa login</span>
        </span>
        <span v-if="role === 'GUEST'" class="font-extrabold text-indigo-500">✓</span>
      </button>

      <button
        v-for="u in demoUsers"
        :key="u.id"
        type="button"
        class="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left"
        :class="[t.item, user?.id === u.id ? t.act : '']"
        @click="choose(u)"
      >
        <span class="grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white" :class="ROLE_META[u.role].avatar">
          {{ initialOf(u) }}
        </span>
        <span class="flex flex-1 flex-col">
          <span class="text-[13px] font-bold" :class="t.fg">{{ roleLabel(u) }}</span>
          <span class="font-mono text-[10px] text-zinc-400">{{ u.role }} · {{ u.email }}</span>
        </span>
        <span v-if="user?.id === u.id" class="font-extrabold text-indigo-500">✓</span>
      </button>
    </div>
  </div>
</template>
