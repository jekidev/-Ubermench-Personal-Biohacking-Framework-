<script setup lang="ts">
const { appendEvent } = useFearprimeStore();
const intensity = ref(5);
const vividness = ref(5);
const happeningNow = ref(5);
const dissociation = ref(2);
const durationMinutes = ref(5);
const recoveryMinutes = ref(10);
const trigger = ref("");
const saved = ref(false);

async function save() {
  await appendEvent({
    id: crypto.randomUUID(),
    type: "intrusion_event",
    timestamp: new Date().toISOString(),
    payload: {
      intensity: intensity.value,
      vividness: vividness.value,
      happeningNow: happeningNow.value,
      dissociation: dissociation.value,
      durationMinutes: durationMinutes.value,
      recoveryMinutes: recoveryMinutes.value,
      trigger: trigger.value.trim() || undefined,
      source: "manual"
    },
    schemaVersion: "2.0.0"
  });
  saved.value = true;
  window.setTimeout(() => (saved.value = false), 1800);
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
    <div>
      <p class="text-sm text-muted">Fearprime / F10</p>
      <h1 class="text-2xl font-semibold">Intrusion</h1>
      <p class="mt-1 text-sm text-muted">Registrér intrusive-memory events separat fra momentær fear under en learning-session.</p>
    </div>
    <UCard>
      <div class="grid gap-6 sm:grid-cols-2">
        <UFormField label="Intensitet"><USlider v-model="intensity" :min="0" :max="10" /><span class="text-sm text-muted">{{ intensity }}/10</span></UFormField>
        <UFormField label="Vividness"><USlider v-model="vividness" :min="0" :max="10" /><span class="text-sm text-muted">{{ vividness }}/10</span></UFormField>
        <UFormField label="Happening-now følelse"><USlider v-model="happeningNow" :min="0" :max="10" /><span class="text-sm text-muted">{{ happeningNow }}/10</span></UFormField>
        <UFormField label="Dissociation"><USlider v-model="dissociation" :min="0" :max="10" /><span class="text-sm text-muted">{{ dissociation }}/10</span></UFormField>
        <UFormField label="Varighed (minutter)"><UInput v-model.number="durationMinutes" type="number" min="0" max="1440" step="1" /></UFormField>
        <UFormField label="Recovery (minutter)"><UInput v-model.number="recoveryMinutes" type="number" min="0" max="1440" step="1" /></UFormField>
        <UFormField label="Udløser" class="sm:col-span-2"><UInput v-model="trigger" placeholder="Kort, ikke-narrativ beskrivelse" class="w-full" /></UFormField>
      </div>
      <div class="mt-6 flex items-center justify-between border-t border-default pt-4">
        <span v-if="saved" class="text-sm text-success">Intrusion gemt lokalt</span>
        <span v-else class="text-xs text-muted">Undgå detaljerede traume-narrativer i almindelig event-log.</span>
        <UButton icon="i-lucide-eye" @click="save">Gem intrusion</UButton>
      </div>
    </UCard>
  </div>
</template>
