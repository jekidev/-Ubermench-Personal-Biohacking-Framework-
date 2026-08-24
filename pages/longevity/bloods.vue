<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4"><div><h1 class="text-2xl font-semibold">Bloods</h1><p class="text-zinc-500">Append-only laboratory history with review-before-save import.</p></div><UButton :loading="busy" @click="openPicker">Add blood test</UButton></div>
    <input ref="input" type="file" class="hidden" accept=".pdf,.csv,.tsv,.json" @change="onFile" />
    <UAlert v-if="error" title="Import error" :description="error" color="error" variant="subtle" />
    <UCard v-if="preview">
      <template #header><div class="flex items-center justify-between"><span class="font-medium">Import preview</span><UBadge variant="subtle">{{ preview.kind }}</UBadge></div></template>
      <div class="grid gap-3 text-sm md:grid-cols-2"><div><span class="text-zinc-500">File</span><div>{{ preview.document.filename }}</div></div><div><span class="text-zinc-500">Format</span><div>{{ preview.format }}</div></div><div><span class="text-zinc-500">SHA-256</span><div class="break-all font-mono text-xs">{{ preview.document.sha256 }}</div></div><div><span class="text-zinc-500">Candidates</span><div>{{ observations.length }}</div></div></div>
      <UAlert v-if="preview.warnings.length" class="mt-4" title="Review required" :description="preview.warnings.join(' • ')" color="warning" variant="subtle" />
      <div v-if="observations.length" class="mt-4 space-y-2"><div v-for="item in observations" :key="item.value.id" class="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm"><span>{{ item.value.biomarker }}</span><span>{{ item.value.value }} {{ item.value.unit }} · {{ item.value.collectedAt }}</span></div></div>
      <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" @click="cancel">Cancel</UButton><UButton :disabled="!observations.length" @click="confirmImport">Confirm import</UButton></div></template>
    </UCard>
    <UCard><template #header><div class="font-medium">Biomarker timeline</div></template><div v-if="!stored.length" class="text-sm text-zinc-500">No confirmed observations yet.</div><div v-else class="space-y-3"><div v-for="item in stored" :key="item.id" class="flex justify-between border-b border-zinc-800 pb-3 text-sm"><span>{{ item.biomarker }}</span><span>{{ item.value }} {{ item.unit }} · {{ item.collectedAt }}</span></div></div></UCard>
  </div>
</template>

<script setup lang="ts">
import { loadLongevityStore, type LocalObservation } from '~/plugins/longevity/persistence/local-store'
import { useLongevityImport } from '~/plugins/longevity/app/use-longevity-import'
import type { SelectedLocalFile } from '~/plugins/longevity/tauri/file-adapter'

const input = ref<HTMLInputElement>()
const stored = ref<LocalObservation[]>([])
const { preview, candidates, busy, error, prepare, confirm, cancel } = useLongevityImport()
const observations = computed(() => candidates.value.filter((item): item is { type: 'observation'; value: LocalObservation } => item.type === 'observation'))
function refresh() { if (import.meta.client) stored.value = loadLongevityStore(localStorage).observations }
refresh()
function openPicker() { input.value?.click() }
async function toSelectedLocalFile(file: File): Promise<SelectedLocalFile> { return { name: file.name, path: '', mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, contents: new Uint8Array(await file.arrayBuffer()) } }
async function onFile(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (file) await prepare(await toSelectedLocalFile(file)) }
async function confirmImport() { const file = input.value?.files?.[0]; if (file) { await confirm(await toSelectedLocalFile(file)); refresh() } }
</script>
