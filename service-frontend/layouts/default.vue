<script setup lang="ts">
// Storefront = light, halaman admin = dark zinc (sesuai board Penpot)
const route = useRoute();
const dark = computed(() => route.path !== '/');

useHead({
  bodyAttrs: { class: computed(() => (dark.value ? 'bg-zinc-950' : 'bg-slate-50')) },
});
</script>

<template>
  <div class="flex min-h-screen flex-col" :class="dark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-zinc-900'">
    <TopNavbar :dark="dark" />
    <main class="flex-1">
      <slot />
    </main>
    <footer class="border-t" :class="dark ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-900 bg-zinc-950'">
      <div class="mx-auto flex max-w-page flex-wrap items-center justify-between gap-2 px-4 py-6 lg:px-10">
        <span class="text-[13px] text-zinc-400">© 2026 TokoAI Microservices — demo e-commerce + AI Agent (MCP)</span>
        <span class="api-hint text-zinc-500">catalog :4001 · order :4002 · ticket :4003 · mcp :5000 · agent :8000</span>
      </div>
    </footer>
    <AiAssistantWidget />
    <AppToasts />
  </div>
</template>
