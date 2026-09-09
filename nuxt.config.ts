export default defineNuxtConfig({
  compatibilityDate: '2026-08-24',
  ssr: false,
  modules: ['@nuxt/ui'],
  devtools: { enabled: true },
  typescript: { strict: true, typeCheck: true },
  css: ['~/assets/css/a11y.css'],
  // Nuxt 4 srcDir is app/. Product pages live in the repo-root pages/ directory.
  dir: {
    pages: '../pages',
  },
  app: {
    head: {
      title: 'Ubermench',
      meta: [{ name: 'theme-color', content: '#09090b' }],
    },
  },
})
