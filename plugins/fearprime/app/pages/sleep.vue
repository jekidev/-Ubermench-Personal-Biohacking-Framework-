<script setup lang="ts">
const { appendEvent } = useFearprimeStore();
const durationHours = ref(7);
const awakenings = ref(1);
const nightmareBurden = ref(2);
const subjectiveQuality = ref(6);
const restoration = ref(6);
const saved = ref(false);

async function save() {
  await appendEvent({
    id: crypto.randomUUID(),
    type: "sleep_record",
    timestamp: new Date().toISOString(),
    payload: {
      date: new Date().toISOString().slice(0, 10),
      durationHours: durationHours.value,
      awakenings: awakenings.value,
      nightmareBurden: nightmareBurden.value,
      subjectiveQuality: subjectiveQuality.value,
      restoration: restoration.value,
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
      <p class="text-sm text-muted">Fearprime / F15</p>
      <h1 class="text-2xl font-semibold">Søvn &amp; mareridt</h1>
      <p class="mt-1 text-sm text-muted">Søvn bruges både som klinisk target og som mulig confounder for næste dags læring.</p>
    </div>
    <UCard>
      <div class="grid gap-6 sm:grid-cols-2">
        <UFormField label="Søvnlængde (timer)"><UInput v-model.number="durationHours" type="number" min="0" max="24" step="0.1" /></UFormField>
        <UFormField label="Antal opvågninger"><UInput v-model.number="awakenings" type="number" min="0" max="50" /></UFormField>
        <UFormField label="Mareridtsbyrde"><USlider v-model="nightmareBurden" :min="0" :max="10" /><span class="text-sm text-muted">{{ nightmareBurden }}/10</span></UFormField>
        <UFormField label="Søvnkvalitet"><USlider v-model="subjectiveQuality" :min="0" :max="10" /><span class="text-sm text-muted">{{ subjectiveQuality }}/10</span></UFormField>
        <UFormField label="Restitution"><USlider v-model="restoration" :min="0" :max="10" /><span class="text-sm text-muted">{{ restoration }}/10</span></UFormField>
      </div>
      <div class="mt-6 flex items-center justify-between border-t border-default pt-4">
        <span v-if="saved" class="text-sm text-success">Søvndata gemt lokalt</span>
        <span v-else class="text-xs text-muted">Brug samme skala hver dag for at gøre ændringer fortolkelige.</span>
        <UButton icon="i-lucide-moon" @click="save">Gem søvn</UButton>
      </div>
    </UCard>
  </div>
</template>
