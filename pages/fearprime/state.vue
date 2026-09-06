<script setup lang="ts">
const { saveDailyState } = useFearprimeStore()
const fear = ref(5)
const sleep = ref(5)
const hyperarousal = ref(5)
const message = ref('')

async function save() {
  await saveDailyState({ fear, sleepQuality: sleep, hyperarousal })
  message.value = 'Daily state saved locally.'
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <NuxtLink to="/fearprime" class="text-sm text-muted">← Fearprime</NuxtLink>
    <h1 class="text-2xl font-semibold">Daily state</h1>
    <UCard class="space-y-4">
      <div><label class="text-sm">Fear (0-10)</label><UInput v-model.number="fear" type="number" min="0" max="10" /></div>
      <div><label class="text-sm">Sleep quality (0-10)</label><UInput v-model.number="sleep" type="number" min="0" max="10" /></div>
      <div><label class="text-sm">Hyperarousal (0-10)</label><UInput v-model.number="hyperarousal" type="number" min="0" max="10" /></div>
      <UButton @click="save">Save state</UButton>
      <p v-if="message" class="text-sm text-primary">{{ message }}</p>
    </UCard>
  </div>
</template>
