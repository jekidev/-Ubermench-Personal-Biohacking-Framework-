<script setup lang="ts">
const { appendEvent } = useFearprimeStore();

const state = reactive({
  fear: 3,
  hypervigilance: 3,
  intrusion: 2,
  dissociation: 0,
  sleepQuality: 6,
  stress: 4,
  energy: 6
});

const saved = ref(false);

async function save() {
  await appendEvent({
    id: crypto.randomUUID(),
    type: "daily_state",
    timestamp: new Date().toISOString(),
    payload: { ...state, source: "manual" },
    schemaVersion: "1.1"
  });
  saved.value = true;
  window.setTimeout(() => (saved.value = false), 1800);
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
    <div>
      <p class="text-sm text-muted">Fearprime / State</p>
      <h1 class="text-2xl font-semibold">Daglig state</h1>
      <p class="mt-1 text-sm text-muted">Kort, gentagelig måling. Den skal bruges som kontekst og confounder-data, ikke som diagnose.</p>
    </div>

    <UCard>
      <div class="grid gap-6 sm:grid-cols-2">
        <div v-for="field in [
          ['fear', 'Fear'],
          ['hypervigilance', 'Hypervigilance'],
          ['intrusion', 'Intrusioner'],
          ['dissociation', 'Dissociation'],
          ['sleepQuality', 'Søvnkvalitet'],
          ['stress', 'Stress'],
          ['energy', 'Energi']
        ]" :key="field[0]" class="space-y-2">
          <div class="flex justify-between text-sm">
            <span>{{ field[1] }}</span>
            <span class="font-medium">{{ state[field[0] as keyof typeof state] }}/10</span>
          </div>
          <USlider v-model="state[field[0] as keyof typeof state]" :min="0" :max="10" :step="1" />
        </div>
      </div>
      <div class="mt-6 flex items-center justify-between border-t border-default pt-4">
        <span v-if="saved" class="text-sm text-success">Gemt lokalt</span>
        <span v-else class="text-xs text-muted">Event store · offline-first</span>
        <UButton icon="i-lucide-save" @click="save">Gem state</UButton>
      </div>
    </UCard>
  </div>
</template>
