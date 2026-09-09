<script setup lang="ts">
const { listMemoryTargets, lockPrediction, createLearningEvent } = useFearprimeStore();

const route = useRoute();
const targets = ref<Awaited<ReturnType<typeof listMemoryTargets>>>([]);
const saved = ref(false);
const lockedPrediction = ref<Awaited<ReturnType<typeof lockPrediction>> | null>(null);

const form = reactive({
  memoryId: "",
  eventType: "extinction" as "acquisition" | "retrieval" | "extinction" | "safety_discrimination" | "counterconditioning" | "imagery_rescripting" | "interoceptive" | "generalisation_stimulus" | "generalisation_context" | "retention_24h" | "retention_7d" | "naturalistic_trigger" | "spontaneous_recovery" | "renewal" | "reinstatement" | "neutral_learning_control" | "real_world_transfer",
  context: "",
  stimulus: "",
  fearPre: 6,
  threatPre: 70,
  safetyPre: 20,
  fearPost: 3,
  threatPost: 30,
  safetyPost: 70,
  expectedOutcome: "Fare/trussel skete ikke",
  expectedProbability: 70,
  predictionConfidence: 70,
  actualOutcome: "threat_absent" as "threat_occurred" | "threat_absent" | "ambiguous" | "not_applicable"
});

onMounted(async () => {
  targets.value = await listMemoryTargets();
  const fromQuery = typeof route.query.memory === "string" ? route.query.memory : "";
  form.memoryId = targets.value.some((target) => target.id === fromQuery) ? fromQuery : targets.value[0]?.id ?? "";
});

async function submit() {
  if (!form.memoryId) return;

  lockedPrediction.value = await lockPrediction({
    expectedOutcome: form.expectedOutcome,
    expectedProbability: form.expectedProbability,
    confidence: form.predictionConfidence
  });

  await createLearningEvent({
    memoryId: form.memoryId,
    eventType: form.eventType,
    context: form.context.trim() || undefined,
    stimulus: form.stimulus.trim() || undefined,
    fearPre: form.fearPre,
    threatPre: form.threatPre,
    safetyPre: form.safetyPre,
    fearPost: form.fearPost,
    threatPost: form.threatPost,
    safetyPost: form.safetyPost,
    actualOutcome: form.actualOutcome
  }, lockedPrediction.value);

  saved.value = true;
  window.setTimeout(() => (saved.value = false), 2200);
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
    <div>
      <p class="text-sm text-muted">Fearprime / Learning</p>
      <h1 class="text-2xl font-semibold">Learning event</h1>
      <p class="mt-1 text-sm text-muted">Predictionen låses umiddelbart før den observerede outcome registreres.</p>
    </div>

    <UAlert color="warning" variant="subtle" title="Forskningslogik" description="Et fald i fear alene er ikke tilstrækkeligt til at konkludere stærkere safety-memory. Prediction, outcome, learning quality og delayed follow-up holdes adskilt." />

    <UCard>
      <div class="grid gap-5 md:grid-cols-2">
        <UFormField label="Memory target" required><USelect v-model="form.memoryId" :items="targets.map(t => ({ label: t.label, value: t.id }))" class="w-full" /></UFormField>
        <UFormField label="Event type"><USelect v-model="form.eventType" :items="[
          { label: 'Acquisition', value: 'acquisition' },
          { label: 'Extinction', value: 'extinction' },
          { label: 'Safety discrimination', value: 'safety_discrimination' },
          { label: 'Retrieval', value: 'retrieval' },
          { label: 'Stimulus generalisation', value: 'generalisation_stimulus' },
          { label: 'Context generalisation', value: 'generalisation_context' },
          { label: 'Imagery rescripting', value: 'imagery_rescripting' },
          { label: 'Interoceptive', value: 'interoceptive' },
          { label: 'Neutral learning control', value: 'neutral_learning_control' },
          { label: 'Real-world transfer', value: 'real_world_transfer' }
        ]" class="w-full" /></UFormField>
        <UFormField label="Kontekst"><UInput v-model="form.context" placeholder="Fx klinik, hjem eller social situation" class="w-full" /></UFormField>
        <UFormField label="Stimulus"><UInput v-model="form.stimulus" placeholder="Kort stimulusbeskrivelse" class="w-full" /></UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header><h2 class="font-semibold">Prediction lock</h2></template>
      <div class="grid gap-5 md:grid-cols-3">
        <UFormField label="Forventet outcome" class="md:col-span-2"><UInput v-model="form.expectedOutcome" class="w-full" /></UFormField>
        <UFormField label="Forventet sandsynlighed"><USlider v-model="form.expectedProbability" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.expectedProbability }}%</span></UFormField>
        <UFormField label="Prediction confidence"><USlider v-model="form.predictionConfidence" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.predictionConfidence }}%</span></UFormField>
        <UAlert v-if="lockedPrediction" class="md:col-span-2" color="success" variant="subtle" title="Prediction låst" :description="`SHA-256: ${lockedPrediction.predictionHash}`" />
      </div>
    </UCard>

    <UCard><template #header><h2 class="font-semibold">Før</h2></template><div class="grid gap-6 sm:grid-cols-3"><UFormField label="Fear"><USlider v-model="form.fearPre" :min="0" :max="10" /><span class="text-sm text-muted">{{ form.fearPre }}/10</span></UFormField><UFormField label="Threat expectancy"><USlider v-model="form.threatPre" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.threatPre }}/100</span></UFormField><UFormField label="Safety expectancy"><USlider v-model="form.safetyPre" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.safetyPre }}/100</span></UFormField></div></UCard>

    <UCard><template #header><h2 class="font-semibold">Efter</h2></template><div class="grid gap-6 sm:grid-cols-3"><UFormField label="Fear"><USlider v-model="form.fearPost" :min="0" :max="10" /><span class="text-sm text-muted">{{ form.fearPost }}/10</span></UFormField><UFormField label="Threat expectancy"><USlider v-model="form.threatPost" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.threatPost }}/100</span></UFormField><UFormField label="Safety expectancy"><USlider v-model="form.safetyPost" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.safetyPost }}/100</span></UFormField></div></UCard>

    <UCard>
      <div class="grid gap-5 md:grid-cols-2">
        <UFormField label="Observeret outcome"><USelect v-model="form.actualOutcome" :items="[{ label: 'Fare/trussel skete', value: 'threat_occurred' }, { label: 'Fare/trussel skete ikke', value: 'threat_absent' }, { label: 'Tvetydigt', value: 'ambiguous' }, { label: 'Ikke relevant', value: 'not_applicable' }]" class="w-full" /></UFormField>
        <div class="flex items-end justify-end"><UButton :disabled="!form.memoryId" icon="i-lucide-lock-keyhole" @click="submit">Lås prediction &amp; gem event</UButton></div>
      </div>
      <div class="mt-4 flex justify-end border-t border-default pt-4"><span v-if="saved" class="text-sm text-success">Learning event gemt · 24h + 7d follow-up oprettet</span></div>
    </UCard>
  </div>
</template>
