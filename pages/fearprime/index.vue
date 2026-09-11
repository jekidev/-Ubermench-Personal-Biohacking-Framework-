<script setup lang="ts">
import { nextBestTest } from '~~/plugins/fearprime/engine/next-best-test'
import { scorePhenotype, type LearningEventForPhenotype } from '~~/plugins/fearprime/engine/phenotype'
import { FEARPRIME_INTERVENTION_REGISTRY } from '~~/plugins/fearprime/interventions/registry'

const { listMemoryTargets, listPendingFollowUps, loadEvents } = useFearprimeStore()
const memoryCount = ref(0)
const followUpCount = ref(0)
const learningEvents = ref<LearningEventForPhenotype[]>([])

const phenotypeSignals = computed(() => scorePhenotype(learningEvents.value))
const nextTest = computed(() => nextBestTest(phenotypeSignals.value, learningEvents.value))

onMounted(async () => {
  memoryCount.value = (await listMemoryTargets()).length
  followUpCount.value = (await listPendingFollowUps()).length
  const events = await loadEvents()
  learningEvents.value = events
    .filter((event) => event.type === 'learning_event')
    .map((event) => {
      const payload = event.payload
      const derived = (payload.derived ?? {}) as Record<string, unknown>
      const learningQuality = (payload.learningQuality ?? {}) as LearningEventForPhenotype['learningQuality']
      return {
        learningQuality,
        threatPre: Number(payload.threatPre ?? 0),
        threatPost: Number(payload.threatPost ?? 0),
        safetyPre: Number(payload.safetyPre ?? 0),
        safetyPost: Number(payload.safetyPost ?? 0),
        followUps: [],
      } satisfies LearningEventForPhenotype
    })
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Fearprime</p>
      <h1 class="mt-2 text-3xl font-semibold">PTSD & fear-learning workspace</h1>
      <p class="mt-2 max-w-3xl text-muted">Offline-first tracking for memory updating, extinction, follow-ups and phenotype signals. Decision support only — not autonomous treatment.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard><p class="text-sm text-muted">Memory targets</p><p class="text-2xl font-semibold">{{ memoryCount }}</p></UCard>
      <UCard><p class="text-sm text-muted">Learning events</p><p class="text-2xl font-semibold">{{ learningEvents.length }}</p></UCard>
      <UCard><p class="text-sm text-muted">Pending follow-ups</p><p class="text-2xl font-semibold">{{ followUpCount }}</p></UCard>
      <UCard><p class="text-sm text-muted">Next-best test</p><p class="text-lg font-semibold">{{ nextTest.testId }}</p></UCard>
    </div>

    <div class="flex flex-wrap gap-2">
      <NuxtLink to="/fearprime/memory"><UButton>Memory targets</UButton></NuxtLink>
      <NuxtLink to="/fearprime/state"><UButton variant="outline">Daily state</UButton></NuxtLink>
      <NuxtLink to="/fearprime/followups"><UButton variant="outline">Follow-ups</UButton></NuxtLink>
      <NuxtLink to="/longevity/meditation"><UButton variant="outline">Meditation log</UButton></NuxtLink>
      <NuxtLink to="/longevity/sleep"><UButton variant="outline">Sleep log</UButton></NuxtLink>
    </div>

    <UCard>
      <h2 class="font-semibold">Phenotype signals</h2>
      <div class="mt-4 space-y-2 text-sm">
        <div v-for="signal in phenotypeSignals" :key="signal.id" class="flex items-center justify-between gap-3 border-b border-default py-2">
          <span>{{ signal.id }}</span>
          <span class="text-muted">{{ signal.status }} · {{ signal.confidence.toFixed(2) }}</span>
        </div>
      </div>
    </UCard>

    <UCard>
      <h2 class="font-semibold">Intervention registry</h2>
      <div class="mt-4 space-y-2 text-sm">
        <div v-for="item in FEARPRIME_INTERVENTION_REGISTRY" :key="item.id" class="flex items-start justify-between gap-3 border-b border-default py-2">
          <div>
            <p class="font-medium">{{ item.name }}</p>
            <p class="text-muted">{{ item.category }} · {{ item.evidenceLevel }}</p>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
