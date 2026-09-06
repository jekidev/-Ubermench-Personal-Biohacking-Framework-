<script setup lang="ts">
import { MITO_COMPLEX_MAP, buildMitoOverlay } from '~/plugins/longevity/mito/mito-complex-map'

const { profile, initialize } = usePersonalBiology()
onMounted(initialize)

const overlay = computed(() => buildMitoOverlay({
  genes: profile.value.variants.map((variant) => variant.gene).filter(Boolean) as string[],
  interventions: profile.value.supplements.map((item) => item.name),
}))
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Longevity</p>
      <h1 class="mt-2 text-3xl font-semibold">Mitochondrial Complex Map</h1>
      <p class="mt-2 text-muted">Electron transport chain overlay from personal variants and interventions.</p>
    </div>

    <div class="grid gap-4 md:grid-cols-5">
      <UCard v-for="node in MITO_COMPLEX_MAP" :key="node.id" :class="overlay.highlightedComplexes.includes(node.complex) ? 'ring-2 ring-primary' : ''">
        <h2 class="font-semibold">Complex {{ node.complex }}</h2>
        <p class="mt-2 text-sm text-muted">{{ node.label }}</p>
        <p v-if="node.genes?.length" class="mt-3 text-xs">Genes: {{ node.genes.join(', ') }}</p>
        <p v-if="node.interventions?.length" class="mt-2 text-xs">Interventions: {{ node.interventions.join(', ') }}</p>
      </UCard>
    </div>

    <UCard>
      <h2 class="font-semibold">Overlay notes</h2>
      <ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
        <li v-for="note in overlay.notes" :key="note">{{ note }}</li>
      </ul>
    </UCard>
  </div>
</template>
