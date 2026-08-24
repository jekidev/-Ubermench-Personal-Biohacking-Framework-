<template>
  <UApp>
    <div class="min-h-screen bg-zinc-950 text-zinc-100">
      <header class="border-b border-zinc-800 px-5 py-3 flex items-center justify-between">
        <div>
          <div class="font-semibold tracking-tight">UBERMENCH</div>
          <div class="text-xs text-zinc-500">Personal Biohacking Framework</div>
        </div>
        <UBadge variant="subtle">Local-first</UBadge>
      </header>
      <div class="flex min-h-[calc(100vh-65px)]">
        <aside class="w-64 shrink-0 border-r border-zinc-800 p-3">
          <nav class="space-y-1">
            <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to" class="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900">
              {{ item.label }}
            </NuxtLink>
          </nav>
        </aside>
        <main class="min-w-0 flex-1 p-6">
          <NuxtPage />
        </main>
      </div>
    </div>
  </UApp>
</template>

<script setup lang="ts">
const navigation = [
  { label: 'Overview', to: '/' },
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
