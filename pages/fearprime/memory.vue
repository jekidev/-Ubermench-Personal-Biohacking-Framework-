<script setup lang="ts">
const { listMemoryTargets, createMemoryTarget } = useFearprimeStore()
const label = ref('')
const threatPrediction = ref('')
const safetyRule = ref('')
const targets = ref<Awaited<ReturnType<typeof listMemoryTargets>>>([])

async function refresh() {
  targets.value = await listMemoryTargets()
}

async function create() {
  if (!label.value.trim()) return
  await createMemoryTarget({
    label: label.value.trim(),
    threatPrediction: threatPrediction.value.trim() || undefined,
    safetyRule: safetyRule.value.trim() || undefined,
    status: 'active',
  })
  label.value = ''
  threatPrediction.value = ''
  safetyRule.value = ''
  await refresh()
}

onMounted(refresh)
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div>
      <NuxtLink to="/fearprime" class="text-sm text-muted">← Fearprime</NuxtLink>
      <h1 class="mt-2 text-2xl font-semibold">Memory targets</h1>
    </div>
    <UCard>
      <div class="grid gap-4 md:grid-cols-2">
        <UInput v-model="label" placeholder="Target label" />
        <UInput v-model="threatPrediction" placeholder="Threat prediction" />
        <UTextarea v-model="safetyRule" placeholder="Safety rule" class="md:col-span-2" />
      </div>
      <UButton class="mt-4" @click="create">Create target</UButton>
    </UCard>
    <UCard>
      <div v-if="!targets.length" class="text-sm text-muted">No memory targets yet.</div>
      <div v-for="target in targets" :key="target.id" class="border-b border-default py-3 text-sm">
        <NuxtLink :to="`/fearprime/memory/${target.id}`" class="font-medium underline">{{ target.label }}</NuxtLink>
        <p class="text-muted">{{ target.status }} · {{ target.createdAt }}</p>
      </div>
    </UCard>
  </div>
</template>
