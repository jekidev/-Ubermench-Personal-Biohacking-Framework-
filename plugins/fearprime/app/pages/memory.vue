<script setup lang="ts">
const { listMemoryTargets, createMemoryTarget, lockPrediction } = useFearprimeStore();

const label = ref("");
const threatPrediction = ref("");
const safetyRule = ref("");
const expectedProbability = ref(50);
const confidence = ref(70);
const targets = ref<Awaited<ReturnType<typeof listMemoryTargets>>>([]);
const locked = ref<Awaited<ReturnType<typeof lockPrediction>> | null>(null);

async function refresh() {
  targets.value = await listMemoryTargets();
}

async function create() {
  if (!label.value.trim()) return;
  const target = await createMemoryTarget({
    label: label.value.trim(),
    threatPrediction: threatPrediction.value.trim() || undefined,
    safetyRule: safetyRule.value.trim() || undefined,
    status: "active"
  });

  locked.value = await lockPrediction({
    expectedOutcome: threatPrediction.value.trim() || "Forventet outcome ikke angivet",
    expectedProbability: expectedProbability.value,
    confidence: confidence.value
  });

  label.value = "";
  threatPrediction.value = "";
  safetyRule.value = "";
  await refresh();
  await navigateTo(`/memory/${target.id}`);
}

onMounted(refresh);
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
    <div>
      <p class="text-sm text-muted">Fearprime / Memory</p>
      <h1 class="text-2xl font-semibold">Memory target builder</h1>
      <p class="mt-1 text-sm text-muted">Predictionen låses før learning-eventet, så efterfølgende outcome ikke kan ændre baseline.</p>
    </div>

    <UCard>
      <div class="grid gap-5 md:grid-cols-2">
        <UFormField label="Target" required>
          <UInput v-model="label" placeholder="Kort target-navn" class="w-full" />
        </UFormField>
        <UFormField label="Threat prediction">
          <UInput v-model="threatPrediction" placeholder="Hvad forventes at ske?" class="w-full" />
        </UFormField>
        <UFormField label="Safety rule">
          <UTextarea v-model="safetyRule" placeholder="Hvilken ny sikkerhedsregel testes?" class="w-full" />
        </UFormField>
        <div class="space-y-4">
          <UFormField label="Forventet sandsynlighed">
            <USlider v-model="expectedProbability" :min="0" :max="100" :step="1" />
            <span class="text-sm text-muted">{{ expectedProbability }}%</span>
          </UFormField>
          <UFormField label="Prediction confidence">
            <USlider v-model="confidence" :min="0" :max="100" :step="1" />
            <span class="text-sm text-muted">{{ confidence }}%</span>
          </UFormField>
        </div>
      </div>

      <div class="mt-6 flex items-center justify-between gap-3 border-t border-default pt-4">
        <p class="text-xs text-muted">Prediction lock bruger SHA-256 hash + timestamp.</p>
        <UButton :disabled="!label.trim()" icon="i-lucide-lock-keyhole" @click="create">Opret &amp; lås prediction</UButton>
      </div>
    </UCard>

    <UCard v-if="locked">
      <template #header><h2 class="font-semibold">Prediction locked</h2></template>
      <p class="text-sm text-muted">{{ locked.expectedOutcome }}</p>
      <p class="mt-2 font-mono text-xs break-all">{{ locked.predictionHash }}</p>
    </UCard>

    <UCard>
      <template #header><h2 class="font-semibold">Aktive targets</h2></template>
      <div v-if="targets.length" class="divide-y divide-default">
        <div v-for="target in targets" :key="target.id" class="flex items-center justify-between py-3">
          <div>
            <p class="font-medium">{{ target.label }}</p>
            <p class="text-xs text-muted">{{ target.status }} · {{ new Date(target.createdAt).toLocaleString('da-DK') }}</p>
          </div>
          <UBadge variant="subtle">{{ target.id.slice(0, 8) }}</UBadge>
        </div>
      </div>
      <p v-else class="text-sm text-muted">Ingen targets endnu.</p>
    </UCard>
  </div>
</template>
