<script setup lang="ts">
/** Panel gelap untuk dashboard admin (header + divider + body) */
withDefaults(defineProps<{ title: string; subtitle?: string; hint?: string; flush?: boolean }>(), {
  flush: false,
});
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
    <header class="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-[18px]">
      <div class="flex flex-col gap-0.5">
        <h2 class="text-base font-bold text-zinc-50">{{ title }}</h2>
        <p v-if="subtitle" class="text-xs text-zinc-400">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-3">
        <slot name="actions" />
        <span v-if="hint" class="api-hint text-zinc-500">{{ hint }}</span>
      </div>
    </header>
    <div :class="flush ? '' : 'flex flex-col gap-4 p-5'">
      <slot />
    </div>
  </section>
</template>
