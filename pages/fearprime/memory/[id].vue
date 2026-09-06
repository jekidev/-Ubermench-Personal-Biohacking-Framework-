<script setup lang="ts">
const route = useRoute()
const { listMemoryTargets } = useFearprimeStore()
const target = ref<Awaited<ReturnType<typeof listMemoryTargets>>[number] | null>(null)

onMounted(async () => {
  const targets = await listMemoryTargets()
  target.value = targets.find((item) => item.id === route.params.id) ?? null
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <NuxtLink to="/fearprime/memory" class="text-sm text-muted">← Memory targets</NuxtLink>
    <UCard v-if="target">
      <h1 class="text-2xl font-semibold">{{ target.label }}</h1>
      <p class="mt-2 text-sm text-muted">Status: {{ target.status }}</p>
      <p v-if="target.threatPrediction" class="mt-4 text-sm">Threat prediction: {{ target.threatPrediction }}</p>
      <p v-if="target.safetyRule" class="mt-2 text-sm">Safety rule: {{ target.safetyRule }}</p>
    </UCard>
    <UAlert v-else title="Target not found" color="warning" variant="subtle" />
  </div>
</template>
