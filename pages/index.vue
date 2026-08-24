<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Ubermench</h1>
      <p class="text-zinc-500">Personal health and biohacking control plane.</p>
    </div>
    <div class="grid gap-4 md:grid-cols-3">
      <UCard v-for="card in cards" :key="card.title">
        <div class="text-sm text-zinc-500">{{ card.title }}</div>
        <div class="mt-2 text-2xl font-semibold">{{ card.value }}</div>
        <div class="mt-1 text-xs text-zinc-500">{{ card.note }}</div>
      </UCard>
    </div>
    <UCard>
      <template #header><div class="font-medium">Modules</div></template>
      <NuxtLink to="/longevity" class="text-sm underline underline-offset-4">Open Longevity</NuxtLink>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const cards = [
  { title: 'Plugins', value: 'Longevity', note: 'Modular plugin architecture' },
  { title: 'Data model', value: 'Local-first', note: 'Health and DNA remain local by default' },
  { title: 'Desktop', value: 'Tauri 2', note: 'Native shell boundary ready' },
]
</script>
