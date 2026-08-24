<template>
  <UApp>
    <div class="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      <header class="flex items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-5">
        <div class="min-w-0">
          <div class="font-semibold tracking-tight">UBERMENCH</div>
          <div class="truncate text-xs text-zinc-500">Personal Biohacking Framework</div>
        </div>
        <UBadge variant="subtle">Local-first</UBadge>
      </header>

      <div class="min-h-[calc(100vh-65px)] md:flex">
        <aside class="hidden w-64 shrink-0 border-r border-zinc-800 p-3 md:block">
          <nav class="space-y-1">
            <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to" class="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900">
              {{ item.label }}
            </NuxtLink>
          </nav>
        </aside>

        <nav class="flex gap-1 overflow-x-auto border-b border-zinc-800 p-2 md:hidden">
          <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to" class="shrink-0 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900">
            {{ item.label }}
          </NuxtLink>
        </nav>

        <main class="min-w-0 flex-1 p-4 sm:p-6">
          <NuxtPage />
        </main>
      </div>
    </div>
  </UApp>
</template>

<script setup lang="ts">
const navigation = [
  { label: 'Overview', to: '/' },
  { label: 'Agent', to: '/agent' },
  { label: 'AI Models', to: '/ai-models' },
  { label: 'Settings', to: '/settings' },
  { label: 'Biology', to: '/biology' },
  { label: 'Longevity', to: '/longevity' },
  { label: 'Bloods', to: '/longevity/bloods' },
  { label: 'Genetics', to: '/longevity/genetics' },
  { label: 'Cardiovascular', to: '/longevity/cardiovascular' },
  { label: 'Metabolic', to: '/longevity/metabolic' },
  { label: 'Fitness', to: '/longevity/fitness' },
  { label: 'Recovery', to: '/longevity/recovery' },
  { label: 'Organ Health', to: '/longevity/organs' },
  { label: 'Prevention', to: '/longevity/prevention' },
  { label: 'Interventions', to: '/longevity/interventions' },
  { label: 'Evidence', to: '/longevity/evidence' },
]
</script>
