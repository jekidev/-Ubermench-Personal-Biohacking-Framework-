export default defineNuxtConfig({
  compatibilityDate: '2026-08-24',
  ssr: false,
  modules: ['@nuxt/ui'],
  devtools: { enabled: true },
  typescript: { strict: true, typeCheck: true },
  runtimeConfig: {
    public: {
      googleClientId: '',
      googleClientSecret: '',
    },
  },
  app: {
    head: {
      title: 'Ubermench',
      meta: [{ name: 'theme-color', content: '#09090b' }],
    },
  },
})
