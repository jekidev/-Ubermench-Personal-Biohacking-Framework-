<script setup lang="ts">
const { appendEvent } = useFearprimeStore();
const instrument = ref<"PCL5" | "CAPS5" | "PHQ9" | "GAD7" | "ISI">("PCL5");
const score = ref<number | undefined>();
const saved = ref(false);

async function save() {
  if (score.value === undefined) return;
  await appendEvent({
    id: crypto.randomUUID(),
    type: "clinical_assessment",
    timestamp: new Date().toISOString(),
    payload: {
      instrument: instrument.value,
      instrumentVersion: "unspecified",
      totalScore: score.value,
      completedBy: "patient",
      source: "manual"
    },
    schemaVersion: "2.0.0"
  });
  saved.value = true;
  window.setTimeout(() => (saved.value = false), 1800);
  score.value = undefined;
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
    <div>
      <p class="text-sm text-muted">Fearprime / Clinical</p>
      <h1 class="text-2xl font-semibold">Kliniske outcomes</h1>
      <p class="mt-1 text-sm text-muted">Fearprime gemmer scoredata, ikke den fulde ordlyd af standardiserede spørgeskemaer.</p>
    </div>

    <UCard>
      <div class="grid gap-5 md:grid-cols-2">
        <UFormField label="Instrument">
          <USelect v-model="instrument" :items="[
            { label: 'PCL-5', value: 'PCL5' },
            { label: 'CAPS-5 (klinikerregistrering)', value: 'CAPS5' },
            { label: 'PHQ-9', value: 'PHQ9' },
            { label: 'GAD-7', value: 'GAD7' },
            { label: 'ISI', value: 'ISI' }
          ]" class="w-full" />
        </UFormField>
        <UFormField label="Samlet score" required>
          <UInput v-model.number="score" type="number" min="0" placeholder="Indtast score fra gennemført instrument" class="w-full" />
        </UFormField>
      </div>
      <div class="mt-6 flex items-center justify-between border-t border-default pt-4">
        <span v-if="saved" class="text-sm text-success">Klinisk score gemt lokalt</span>
        <span v-else class="text-xs text-muted">Kliniske outcomes prioriteres over wearable-only signaler.</span>
        <UButton :disabled="score === undefined" icon="i-lucide-clipboard-check" @click="save">Gem outcome</UButton>
      </div>
    </UCard>
  </div>
</template>
