<script setup lang="ts">
/** Penpot DS: Button (Primary | Secondary | Success | Danger | Dark Ghost | Dark Primary) */
type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'dark-primary';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: 'sm' | 'md';
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
    type?: 'button' | 'submit';
  }>(),
  { variant: 'primary', size: 'md', type: 'button' }
);

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
  secondary: 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50',
  success: 'bg-green-600 text-white hover:bg-green-500',
  danger: 'bg-white text-red-600 border border-red-300 hover:bg-red-50',
  ghost: 'bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700',
  'dark-primary': 'bg-indigo-500 text-white hover:bg-indigo-400',
};

const cls = computed(() => [
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
  props.size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2.5 text-sm',
  props.block ? 'w-full' : '',
  VARIANTS[props.variant],
]);
</script>

<template>
  <button :type="type" :class="cls" :disabled="disabled || loading">
    <svg v-if="loading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity=".25" stroke-width="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
    </svg>
    <slot />
  </button>
</template>
