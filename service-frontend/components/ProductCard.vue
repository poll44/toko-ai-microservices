<script setup lang="ts">
import type { Product } from '~/types';

/** Penpot DS: Product Card */
defineProps<{ product: Product; loading?: boolean; lowStockThreshold?: number }>();
defineEmits<{ buy: [product: Product] }>();
</script>

<template>
  <article class="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div class="relative flex h-[196px] items-start justify-between bg-gradient-to-br from-indigo-100 to-violet-50 p-3">
      <span class="rounded-md bg-white/85 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-700">{{ product.id }}</span>
      <StatusBadge
        v-if="product.stock > 0 && product.stock <= (lowStockThreshold ?? 5)"
        status="LOW STOCK"
        :label="`${product.stock} left`"
      />
      <StatusBadge v-else-if="product.stock === 0" status="FAILED" label="Habis" />
      <span class="pointer-events-none absolute inset-0 grid place-items-center text-[56px] font-extrabold text-indigo-300">
        {{ productGlyph(product.name) }}
      </span>
    </div>

    <div class="flex flex-1 flex-col gap-1.5 p-4">
      <h3 class="text-base font-bold text-zinc-950">{{ product.name }}</h3>
      <p class="text-[13px] text-zinc-500">{{ product.description || '—' }}</p>
      <div class="mt-auto flex items-center justify-between pt-2">
        <span class="text-lg font-extrabold text-indigo-600">{{ rupiah(product.price) }}</span>
        <span class="text-xs font-medium text-zinc-500">Stok: {{ product.stock }}</span>
      </div>
      <UiButton class="mt-1" block :loading="loading" :disabled="product.stock === 0" @click="$emit('buy', product)">
        Beli Sekarang
      </UiButton>
    </div>
  </article>
</template>
