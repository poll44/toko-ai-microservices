<script setup lang="ts">
defineProps<{ label: string; value: string | number; meta?: string; color?: string; mono?: boolean }>();
</script>

<template>
  <div class="flex flex-1 flex-col gap-1.5 rounded-[14px] border border-zinc-800 bg-zinc-900 px-[18px] py-4">
    <span class="text-xs font-medium text-zinc-400" :class="mono ? 'font-mono font-bold text-[11px]' : ''">{{ label }}</span>
    <span class="text-[30px] font-extrabold leading-none" :class="color ?? 'text-zinc-100'">{{ value }}</span>
    <span v-if="meta" class="truncate font-mono text-[11px] text-zinc-500">{{ meta }}</span>
  </div>
</template>
