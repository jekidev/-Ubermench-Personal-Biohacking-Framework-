<script setup lang="ts">
import type { HFModelEngine, HFModelTier } from '~/types/hf-model'

const { models, tierS } = useHFModelRegistry()

const selectedEngine = ref<'all' | HFModelEngine>('all')
const selectedTier = ref<'all' | HFModelTier>('all')
const showLocalOnly = ref(false)

const engines: Array<{ value: 'all' | HFModelEngine; label: string }> = [
  { value: 'all', label: 'All engines' },
  { value: 'genomics', label: 'Genomics' },
  { value: 'protein', label: 'Protein' },
  { value: 'cellular', label: 'Cellular' },
  { value: 'biomedical', label: 'Biomedical' },
  { value: 'molecular', label: 'Molecular' },
  { value: 'phenotype', label: 'Phenotype' },
  { value: 'benchmark', label: 'Benchmarks' },
]

const tiers: Array<{ value: 'all' | HFModelTier; label: string }> = [
  { value: 'all', label: 'All tiers' },
  { value: 'S', label: 'S-tier' },
  { value: 'A', label: 'A-tier' },
  { value: 'B', label: 'B-tier' },
]

const filteredModels = computed(() => models.value.filter((model) => {
  const engineMatch = selectedEngine.value === 'all' || model.engine === selectedEngine.value
  const tierMatch = selectedTier.value === 'all' || model.tier === selectedTier.value
  const runtimeMatch = !showLocalOnly.value || model.runtime !== 'remote'
  return engineMatch && tierMatch && runtimeMatch
}))

const stats = computed(() => ({
  total: models.value.length,
  sTier: tierS.value.length,
  local: models.value.filter((model) => model.runtime === 'local' || model.runtime === 'hybrid').length,
  sensitive: models.value.filter((model) => model.privacy !== 'public-safe').length,
}))
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-8 px-6 py-10">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">AI / Hugging Face</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">Biohacking AI Model Registry</h1>
      <p class="mt-2 max-w-3xl text-muted">
        Typed registry for genomics, protein, cellular, biomedical, molecular and phenotype engines.
        Sensitive biological inputs default toward local processing.
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <UCard><p class="text-sm text-muted">Registered</p><p class="text-2xl font-semibold">{{ stats.total }}</p></UCard>
      <UCard><p class="text-sm text-muted">S-tier</p><p class="text-2xl font-semibold">{{ stats.sTier }}</p></UCard>
      <UCard><p class="text-sm text-muted">Local / hybrid</p><p class="text-2xl font-semibold">{{ stats.local }}</p></UCard>
      <UCard><p class="text-sm text-muted">Sensitive/restricted</p><p class="text-2xl font-semibold">{{ stats.sensitive }}</p></UCard>
    </div>

    <UCard>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="engine in engines"
            :key="engine.value"
            :variant="selectedEngine === engine.value ? 'solid' : 'ghost'"
            size="sm"
            @click="selectedEngine = engine.value"
          >
            {{ engine.label }}
          </UButton>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <USelect v-model="selectedTier" :items="tiers" value-key="value" label-key="label" class="w-32" />
          <USwitch v-model="showLocalOnly" label="Local / hybrid" />
        </div>
      </div>
    </UCard>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <UCard v-for="model in filteredModels" :key="model.id" class="flex flex-col">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">{{ model.engine }}</p>
            <h2 class="mt-1 font-semibold">{{ model.name }}</h2>
          </div>
          <UBadge :color="model.tier === 'S' ? 'primary' : 'neutral'" variant="subtle">{{ model.tier }}</UBadge>
        </div>

        <p class="mt-3 text-sm text-muted">{{ model.role }}</p>

        <div class="mt-4 flex flex-wrap gap-2">
          <UBadge variant="outline">{{ model.runtime }}</UBadge>
          <UBadge variant="outline">{{ model.privacy }}</UBadge>
          <UBadge v-if="model.gated" variant="outline">gated</UBadge>
          <UBadge variant="outline">{{ model.license }}</UBadge>
        </div>

        <div class="mt-4 space-y-1 text-xs text-muted">
          <p>RAM: ≥ {{ model.minRamGb }} GB · VRAM: {{ model.recommendedVramGb }} GB</p>
          <p>{{ model.tasks.join(' · ') }}</p>
        </div>

        <div class="mt-5 flex items-center justify-between gap-3">
          <span class="truncate text-xs text-muted">{{ model.id }}</span>
          <UButton :to="model.url" target="_blank" size="xs" variant="soft">Open HF</UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>
