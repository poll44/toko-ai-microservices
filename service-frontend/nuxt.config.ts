// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // SPA: token JWT disimpan di localStorage & semua data diambil dari gateway di sisi browser
  ssr: false,
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      // Semua request frontend HANYA lewat service-gateway (override: NUXT_PUBLIC_API_BASE)
      apiBase: 'http://localhost:8080',
      // Nama app ADK (GET /api/agent/list-apps -> ["agent"]) (override: NUXT_PUBLIC_AGENT_APP)
      agentApp: 'agent',
    },
  },

  app: {
    head: {
      title: 'TokoAI Microservices',
      htmlAttrs: { lang: 'id' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },

  devServer: { port: 3000 },
});
