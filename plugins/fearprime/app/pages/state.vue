<script setup lang="ts">
const { appendEvent } = useFearprimeStore();

const sliderFields = [
  ["fear", "Fear"],
  ["hypervigilance", "Hypervigilance"],
  ["intrusion", "Intrusioner"],
  ["dissociation", "Dissociation"],
  ["interoceptiveThreat", "Interoceptiv threat"],
  ["socialThreat", "Social threat"],
  ["cognitiveClarity", "Kognitiv klarhed"],
  ["sleepQuality", "Søvnkvalitet"],
  ["stress", "Stress"],
  ["energy", "Energi"],
  ["function", "Funktion"],
] as const;

type SliderField = (typeof sliderFields)[number][0];

const sliders = reactive<Record<SliderField, number>>({
  fear: 3,
  hypervigilance: 3,
  intrusion: 2,
  dissociation: 0,
  interoceptiveThreat: 2,
  socialThreat: 2,
  cognitiveClarity: 6,
  sleepQuality: 6,
  stress: 4,
  energy: 6,
  function: 7,
});

const confounded = ref(false);

const saved = ref(false);

async function save() {
  await appendEvent({
    id: crypto.randomUUID(),
    type: "daily_state",
    timestamp: new Date().toISOString(),
    payload: { ...sliders, confounded: confounded.value, source: "manual" },
    schemaVersion: "2.0.0"
  });
  saved.value = true;
  window.setTimeout(() => (saved.value = false), 1800);
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
    <div>
      <p class="text-sm text-muted">Fearprime / daglig state</p>
      <h1 class="text-2xl font-semibold">PTSD state capture</h1>
      <p class="mt-1 text-sm text-muted">Gentagelige state-signaler til F1/F7/F8/F10/F13 og som kontekst omkring learning-events.</p>
    </div>

    <UCard>
      <div class="grid gap-6 sm:grid-cols-2">
        <div v-for="field in sliderFields" :key="field[0]" class="space-y-2">
          <div class="flex justify-between text-sm"><span>{{ field[1] }}</span><span class="font-medium">{{ sliders[field[0]] }}/10</span></div>
          <USlider v-model="sliders[field[0]]" :min="0" :max="10" :step="1" />
        </div>
      </div>

      <div class="mt-6 flex items-center gap-3 border-t border-default pt-4">
        <UCheckbox v-model="confounded" label="Større confounder i dag (fx sygdom, markant søvnmangel eller anden stor ændring)" />
      </div>

      <div class="mt-4 flex items-center justify-between border-t border-default pt-4">
        <span v-if="saved" class="text-sm text-success">Gemt lokalt</span>
        <span v-else class="text-xs text-muted">State-data bruges som kontekst; de udgør ikke i sig selv en diagnose.</span>
        <UButton icon="i-lucide-save" @click="save">Gem state</UButton>
      </div>
    </UCard>
  </div>
</template>
