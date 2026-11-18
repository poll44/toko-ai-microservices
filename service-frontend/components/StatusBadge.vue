<script setup lang="ts">
/** Penpot DS: Status Badge (Status × Theme) */
const props = withDefaults(
  defineProps<{
    status: string; // PAID | FAILED | PENDING | OPEN | ESCALATED | RESOLVED | LOW STOCK | lainnya = netral
    theme?: 'light' | 'dark';
    label?: string;
  }>(),
  { theme: 'light' }
);

const STYLES: Record<string, { light: string; dark: string; dotL: string; dotD: string }> = {
  PAID: { light: 'bg-green-100 text-green-800', dark: 'bg-green-950 text-green-400', dotL: 'bg-green-600', dotD: 'bg-green-400' },
  FAILED: { light: 'bg-red-100 text-red-800', dark: 'bg-red-950 text-red-400', dotL: 'bg-red-600', dotD: 'bg-red-400' },
  PENDING: { light: 'bg-amber-100 text-amber-800', dark: 'bg-amber-950 text-amber-400', dotL: 'bg-amber-600', dotD: 'bg-amber-400' },
  OPEN: { light: 'bg-blue-100 text-blue-800', dark: 'bg-blue-950 text-blue-400', dotL: 'bg-blue-600', dotD: 'bg-blue-400' },
  ESCALATED: { light: 'bg-purple-100 text-purple-800', dark: 'bg-purple-950 text-purple-400', dotL: 'bg-purple-600', dotD: 'bg-purple-400' },
  RESOLVED: { light: 'bg-emerald-100 text-emerald-800', dark: 'bg-emerald-950 text-emerald-400', dotL: 'bg-emerald-500', dotD: 'bg-emerald-400' },
  'LOW STOCK': { light: 'bg-orange-100 text-orange-800', dark: 'bg-orange-950 text-orange-400', dotL: 'bg-orange-600', dotD: 'bg-orange-400' },
};
const NEUTRAL = { light: 'bg-zinc-100 text-zinc-700', dark: 'bg-zinc-800 text-zinc-300', dotL: 'bg-zinc-500', dotD: 'bg-zinc-400' };

const s = computed(() => STYLES[props.status] ?? NEUTRAL);
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
    :class="theme === 'dark' ? s.dark : s.light"
  >
    <span class="h-1.5 w-1.5 rounded-full" :class="theme === 'dark' ? s.dotD : s.dotL" />
    {{ label ?? status }}
  </span>
</template>
