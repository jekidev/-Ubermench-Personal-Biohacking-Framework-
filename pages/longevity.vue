<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div><h1 class="text-2xl font-semibold">Longevity</h1><p class="text-zinc-500">Longitudinal health dashboard.</p></div>
      <div class="flex gap-2"><UButton to="/longevity/bloods">Add blood test</UButton><UButton to="/longevity/genetics" variant="outline">Upload DNA</UButton></div>
    </div>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard v-for="metric in metrics" :key="metric.label">
        <div class="text-sm text-zinc-500">{{ metric.label }}</div>
        <div class="mt-2 text-2xl font-semibold">{{ metric.value }}</div>
        <div class="mt-1 text-xs text-zinc-500">{{ metric.note }}</div>
      </UCard>
    </div>
    <div class="grid gap-4 lg:grid-cols-2">
      <UCard><template #header><div class="font-medium">Data streams</div></template><ul class="space-y-2 text-sm text-zinc-400"><li>Blood biomarkers</li><li>Genetic variants and evidence</li><li>Blood pressure and pulse</li><li>Fitness and recovery</li></ul></UCard>
      <UCard><template #header><div class="font-medium">Safety</div></template><p class="text-sm text-zinc-500">Import and analytics layers are review-first. The dashboard does not diagnose or prescribe.</p></UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const metrics = [
  { label: 'Bloods', value: '0', note: 'Confirmed observations' },
  { label: 'Genetics', value: '0', note: 'Imported variants' },
  { label: 'Cardiovascular', value: '—', note: 'Awaiting baseline' },
  { label: 'Fitness', value: '—', note: 'Awaiting wearable data' },
]
</script>
