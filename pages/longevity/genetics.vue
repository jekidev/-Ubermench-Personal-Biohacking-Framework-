<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between"><div><h1 class="text-2xl font-semibold">Genetics</h1><p class="text-zinc-500">Local-first DNA and genetic-analysis workspace.</p></div><UButton @click="openPicker">Upload DNA</UButton></div>
    <input ref="input" type="file" class="hidden" accept=".vcf,.csv,.tsv,.json,.pdf,.txt" @change="onFile" />
    <UAlert v-if="message" :title="message" color="primary" variant="subtle" />
    <div class="grid gap-4 md:grid-cols-3"><UCard v-for="item in cards" :key="item.title"><div class="text-sm text-zinc-500">{{ item.title }}</div><div class="mt-2 text-xl font-semibold">{{ item.value }}</div></UCard></div>
    <UCard><template #header><div class="font-medium">Data separation</div></template><p class="text-sm text-zinc-500">Original genotype data, evidence mappings and interpretations remain separate and versionable.</p></UCard>
  </div>
</template>

<script setup lang="ts">
const input = ref<HTMLInputElement>()
const message = ref('')
const cards = [{ title: 'Raw variants', value: '0' }, { title: 'Findings', value: '0' }, { title: 'Needs review', value: '0' }]
function openPicker() { input.value?.click() }
function onFile(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (file) message.value = `Selected ${file.name}. The file remains local until explicit import confirmation.` }
</script>
