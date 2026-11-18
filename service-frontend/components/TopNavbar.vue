<script setup lang="ts">
defineProps<{ dark?: boolean }>();

const TABS = [
  { label: 'Storefront', to: '/' },
  { label: 'Dashboard Operasional', to: '/admin' },
  { label: 'Antrean Dev', to: '/dev' },
];
const route = useRoute();
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b"
    :class="dark ? 'border-zinc-800 bg-zinc-950/95 backdrop-blur' : 'border-zinc-200 bg-white/95 backdrop-blur'"
  >
    <div class="mx-auto flex h-[72px] max-w-page items-center justify-between gap-4 px-4 lg:px-10">
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <span class="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-gradient-to-br from-indigo-500 to-violet-500 text-[17px] font-extrabold text-white">T</span>
        <span class="hidden flex-col md:flex">
          <span class="text-base font-extrabold" :class="dark ? 'text-zinc-50' : 'text-zinc-950'">TokoAI Microservices</span>
          <span class="font-mono text-[10px] font-medium" :class="dark ? 'text-zinc-400' : 'text-zinc-500'">gateway :8080 · catalog · order · ticket · agent</span>
        </span>
      </NuxtLink>

      <nav class="flex gap-1 rounded-[10px] p-1" :class="dark ? 'bg-zinc-900' : 'bg-zinc-100'">
        <NuxtLink
          v-for="tab in TABS"
          :key="tab.to"
          :to="tab.to"
          class="whitespace-nowrap rounded-[7px] px-2.5 py-2 text-[13px] transition sm:px-3.5"
          :class="
            route.path === tab.to
              ? dark
                ? 'bg-zinc-800 font-bold text-white'
                : 'bg-white font-bold text-zinc-950 shadow-sm'
              : dark
                ? 'font-medium text-zinc-400 hover:text-zinc-200'
                : 'font-medium text-zinc-500 hover:text-zinc-800'
          "
        >
          {{ tab.label }}
        </NuxtLink>
      </nav>

      <RoleSwitcher :dark="dark" />
    </div>
  </header>
</template>
