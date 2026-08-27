<script setup lang="ts">
const { listMemoryTargets, createMemoryTarget } = useFearprimeStore();

const label = ref("");
const threatPrediction = ref("");
const safetyRule = ref("");
const targets = ref<Awaited<ReturnType<typeof listMemoryTargets>>>([]);

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

  label.value = "";
  threatPrediction.value = "";
  safetyRule.value = "";
  await refresh();
  await navigateTo(`/learning?memory=${target.id}`);
}

onMounted(refresh);
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
    <div>
      <p class="text-sm text-muted">Fearprime / Memory</p>
      <h1 class="text-2xl font-semibold">Memory target builder</h1>
      <p class="mt-1 text-sm text-muted">Opret target først. Predictionen låses først, når den konkrete learning-test starter.</p>
    </div>

    <UCard>
      <div class="grid gap-5 md:grid-cols-2">
        <UFormField label="Target" required>
          <UInput v-model="label" placeholder="Kort target-navn" class="w-full" />
        </UFormField>
        <UFormField label="Trusselsforudsigelse">
          <UInput v-model="threatPrediction" placeholder="Hvad forventes at ske?" class="w-full" />
        </UFormField>
        <UFormField label="Sikkerhedsregel">
          <UTextarea v-model="safetyRule" placeholder="Hvilken sikkerhedsregel testes?" class="w-full" />
        </UFormField>
      </div>

      <div class="mt-6 flex items-center justify-between gap-3 border-t border-default pt-4">
        <p class="text-xs text-muted">Prediction lock sker umiddelbart før outcome kan observeres.</p>
        <UButton :disabled="!label.trim()" icon="i-lucide-brain" @click="create">Opret memory target</UButton>
      </div>
    </UCard>

    <UCard>
      <template #header><h2 class="font-semibold">Aktive targets</h2></template>
      <div v-if="targets.length" class="divide-y divide-default">
        <NuxtLink v-for="target in targets" :key="target.id" :to="`/learning?memory=${target.id}`" class="flex items-center justify-between py-3 transition hover:bg-elevated/60">
          <div>
            <p class="font-medium">{{ target.label }}</p>
            <p class="text-xs text-muted">{{ target.status }} · {{ new Date(target.createdAt).toLocaleString('da-DK') }}</p>
          </div>
          <UBadge variant="subtle">Start learning</UBadge>
        </NuxtLink>
      </div>
      <p v-else class="text-sm text-muted">Ingen targets endnu.</p>
    </UCard>
  </div>
</template>
