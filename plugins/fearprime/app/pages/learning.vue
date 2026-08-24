<script setup lang="ts">
const { listMemoryTargets, createLearningEvent } = useFearprimeStore();
const targets = ref<Awaited<ReturnType<typeof listMemoryTargets>>>([]);
const saved = ref(false);
const form = reactive({ memoryId: "", eventType: "extinction" as "extinction" | "retrieval" | "safety_discrimination" | "generalisation" | "imagery_rescripting" | "interoceptive", context: "", stimulus: "", fearPre: 6, threatPre: 70, safetyPre: 20, fearPost: 3, threatPost: 30, safetyPost: 70, actualOutcome: "nej", expectedProbability: 70 });

onMounted(async () => { targets.value = await listMemoryTargets(); form.memoryId = targets.value[0]?.id ?? ""; });
async function submit() { if (!form.memoryId) return; await createLearningEvent({ ...form }); saved.value = true; setTimeout(() => (saved.value = false), 2200); }
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
    <div><p class="text-sm text-muted">Fearprime / Learning</p><h1 class="text-2xl font-semibold">Learning event</h1><p class="mt-1 text-sm text-muted">Registrér læringshændelsen separat fra delayed retention.</p></div>
    <UAlert color="warning" variant="subtle" title="Forskningslogik" description="Et fald i fear alene er ikke tilstrækkeligt til at konkludere, at safety-memory er styrket. Prediction, outcome og delayed follow-up gemmes separat." />
    <UCard>
      <div class="grid gap-5 md:grid-cols-2">
        <UFormField label="Memory target" required><USelect v-model="form.memoryId" :items="targets.map(t => ({ label: t.label, value: t.id }))" class="w-full" /></UFormField>
        <UFormField label="Event type"><USelect v-model="form.eventType" :items="[{ label: 'Extinction', value: 'extinction' }, { label: 'Safety discrimination', value: 'safety_discrimination' }, { label: 'Retrieval', value: 'retrieval' }, { label: 'Generalisation', value: 'generalisation' }, { label: 'Imagery rescripting', value: 'imagery_rescripting' }, { label: 'Interoceptive', value: 'interoceptive' }]" class="w-full" /></UFormField>
        <UFormField label="Kontekst"><UInput v-model="form.context" placeholder="Fx klinik, hjem, social situation" class="w-full" /></UFormField>
        <UFormField label="Stimulus"><UInput v-model="form.stimulus" placeholder="Kort stimulusbeskrivelse" class="w-full" /></UFormField>
      </div>
    </UCard>
    <UCard><template #header><h2 class="font-semibold">Før</h2></template><div class="grid gap-6 sm:grid-cols-3"><UFormField label="Fear"><USlider v-model="form.fearPre" :min="0" :max="10" /><span class="text-sm text-muted">{{ form.fearPre }}/10</span></UFormField><UFormField label="Threat expectancy"><USlider v-model="form.threatPre" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.threatPre }}/100</span></UFormField><UFormField label="Safety expectancy"><USlider v-model="form.safetyPre" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.safetyPre }}/100</span></UFormField></div></UCard>
    <UCard><template #header><h2 class="font-semibold">Efter</h2></template><div class="grid gap-6 sm:grid-cols-3"><UFormField label="Fear"><USlider v-model="form.fearPost" :min="0" :max="10" /><span class="text-sm text-muted">{{ form.fearPost }}/10</span></UFormField><UFormField label="Threat expectancy"><USlider v-model="form.threatPost" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.threatPost }}/100</span></UFormField><UFormField label="Safety expectancy"><USlider v-model="form.safetyPost" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.safetyPost }}/100</span></UFormField></div></UCard>
    <UCard><div class="grid gap-5 md:grid-cols-2"><UFormField label="Forventet sandsynlighed"><USlider v-model="form.expectedProbability" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.expectedProbability }}%</span></UFormField><UFormField label="Actual outcome"><USelect v-model="form.actualOutcome" :items="[{ label: 'Fare/trussel skete', value: 'ja' }, { label: 'Fare/trussel skete ikke', value: 'nej' }]" class="w-full" /></UFormField></div><div class="mt-6 flex items-center justify-between border-t border-default pt-4"><span class="text-xs text-muted">Der oprettes automatisk 24h og 7d follow-up.</span><div class="flex items-center gap-3"><span v-if="saved" class="text-sm text-success">Learning event gemt</span><UButton :disabled="!form.memoryId" icon="i-lucide-flask-conical" @click="submit">Gem learning event</UButton></div></div></UCard>
  </div>
</template>
