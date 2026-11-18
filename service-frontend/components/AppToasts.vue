<script setup lang="ts">
const { toasts, dismiss } = useToast();
</script>

<template>
  <div class="pointer-events-none fixed left-1/2 top-20 z-[60] flex w-[min(480px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-2">
    <TransitionGroup
      enter-active-class="transition duration-200"
      enter-from-class="-translate-y-2 opacity-0"
      leave-active-class="transition duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg"
        :class="{
          'border-green-200 bg-green-50 text-green-800': t.type === 'success',
          'border-red-200 bg-red-50 text-red-800': t.type === 'error',
          'border-zinc-200 bg-white text-zinc-800': t.type === 'info',
        }"
        role="status"
      >
        <span>{{ t.type === 'success' ? '✓' : t.type === 'error' ? '⚠' : 'ℹ' }}</span>
        <span class="flex-1">{{ t.text }}</span>
        <button class="opacity-60 hover:opacity-100" @click="dismiss(t.id)">✕</button>
      </div>
    </TransitionGroup>
  </div>
</template>
