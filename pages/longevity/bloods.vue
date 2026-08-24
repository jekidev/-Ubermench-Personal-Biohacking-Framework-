<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between"><div><h1 class="text-2xl font-semibold">Bloods</h1><p class="text-zinc-500">Append-only laboratory history.</p></div><UButton @click="openPicker">Add blood test</UButton></div>
    <UAlert v-if="message" :title="message" color="primary" variant="subtle" />
    <input ref="input" type="file" class="hidden" accept=".pdf,.csv,.tsv,.json" @change="onFile" />
    <UCard><template #header><div class="font-medium">Biomarker timeline</div></template><div v-if="!observations.length" class="text-sm text-zinc-500">No confirmed observations yet. Import a laboratory report to start the timeline.</div><div v-else class="space-y-3"><div v-for="item in observations" :key="item.id" class="flex justify-between border-b border-zinc-800 pb-3 text-sm"><span>{{ item.biomarker }}</span><span>{{ item.value }} {{ item.unit }} · {{ item.collectedAt }}</span></div></div></UCard>
  </div>
</template>

<script setup lang="ts">
import { loadLongevityStore } from '~/plugins/longevity/persistence/local-store'

const input = ref<HTMLInputElement>()
const message = ref('')
const observations = ref(loadLongevityStore(import.meta.client ? localStorage : { getItem: () => null }).observations)

function openPicker() { input.value?.click() }
function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  message.value = `Selected ${file.name}. Review-first parsing is ready for the native import adapter.`
}
</script>
