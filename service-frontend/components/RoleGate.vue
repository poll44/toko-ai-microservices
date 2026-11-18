<script setup lang="ts">
import type { Role } from '~/types';

/**
 * Menampilkan konten hanya untuk role tertentu. Ini hanya UX —
 * otorisasi sesungguhnya tetap di backend (requireRole di tiap service).
 */
const props = defineProps<{ roles: Role[]; title: string }>();

const { role, demoUsers, loadDemoUsers, loginAs, switching } = useAuth();
const { error } = useToast();

const allowed = computed(() => props.roles.includes(role.value));
const candidates = computed(() => demoUsers.value.filter((u) => props.roles.includes(u.role)));

onMounted(() => loadDemoUsers().catch(() => {}));

async function switchTo(email: string) {
  try {
    await loginAs(email);
  } catch (e: any) {
    error(e.message);
  }
}
</script>

<template>
  <slot v-if="allowed" />
  <div v-else class="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-24 text-center">
    <div class="grid h-14 w-14 place-items-center rounded-2xl bg-zinc-800 text-2xl">🔒</div>
    <h1 class="text-2xl font-extrabold text-white">{{ title }}</h1>
    <p class="text-sm text-zinc-400">
      Halaman ini khusus role <span class="font-mono text-zinc-200">{{ roles.join(' / ') }}</span>.
      Role aktif kamu: <span class="font-mono text-zinc-200">{{ role }}</span>.
    </p>
    <div class="flex flex-wrap justify-center gap-2">
      <UiButton
        v-for="u in candidates"
        :key="u.id"
        variant="dark-primary"
        :loading="switching"
        @click="switchTo(u.email)"
      >
        Masuk sebagai {{ roleLabel(u) }}
      </UiButton>
    </div>
  </div>
</template>
