<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4"><div><h1 class="text-2xl font-semibold">Genetics</h1><p class="text-zinc-500">Local-first DNA import with raw-data / interpretation separation.</p></div><UButton :loading="busy" @click="openPicker">Upload DNA</UButton></div>
    <input ref="input" type="file" class="hidden" accept=".vcf,.csv,.tsv,.json,.pdf,.txt" @change="onFile" />
    <UAlert v-if="error" title="Import error" :description="error" color="error" variant="subtle" />
    <UCard v-if="preview">
      <template #header><div class="flex items-center justify-between"><span class="font-medium">DNA import preview</span><UBadge variant="subtle">{{ preview.kind }}</UBadge></div></template>
      <div class="grid gap-3 text-sm md:grid-cols-2"><div><span class="text-zinc-500">File</span><div>{{ preview.document.filename }}</div></div><div><span class="text-zinc-500">Format</span><div>{{ preview.format }}</div></div><div><span class="text-zinc-500">SHA-256</span><div class="break-all font-mono text-xs">{{ preview.document.sha256 }}</div></div><div><span class="text-zinc-500">Candidates</span><div>{{ variants.length }}</div></div></div>
      <UAlert v-if="preview.warnings.length" class="mt-4" title="Review required" :description="preview.warnings.join(' • ')" color="warning" variant="subtle" />
      <div v-if="variants.length" class="mt-4 max-h-72 space-y-2 overflow-auto"><div v-for="item in variants" :key="item.value.id" class="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm"><span>{{ item.value.gene || item.value.rsid || item.value.chromosome || 'variant' }}</span><span>{{ item.value.rsid || '' }} · {{ item.value.genotype }}</span></div></div>
      <template #footer><div class="flex justify-end gap-2"><UButton variant="ghost" @click="cancel">Cancel</UButton><UButton :disabled="!variants.length" @click="confirmImport">Confirm import</UButton></div></template>
    </UCard>
    <div class="grid gap-4 md:grid-cols-3"><UCard><div class="text-sm text-zinc-500">Raw variants</div><div class="mt-2 text-xl font-semibold">{{ stored.length }}</div></UCard><UCard><div class="text-sm text-zinc-500">Findings</div><div class="mt-2 text-xl font-semibold">0</div></UCard><UCard><div class="text-sm text-zinc-500">Needs review</div><div class="mt-2 text-xl font-semibold">{{ stored.length ? 'Review evidence' : '0' }}</div></UCard></div>
    <UCard><template #header><div class="font-medium">Data separation</div></template><p class="text-sm text-zinc-500">Original genotype records are stored separately from evidence-backed interpretations, so future evidence updates never rewrite the raw genotype.</p></UCard>
  </div>
</template>

<script setup lang="ts">
import { loadLongevityStore, type LocalGeneticVariant } from '~/plugins/longevity/persistence/local-store'
import { useLongevityImport } from '~/plugins/longevity/app/use-longevity-import'
import type { SelectedLocalFile } from '~/plugins/longevity/tauri/file-adapter'

const input = ref<HTMLInputElement>()
const stored = ref<LocalGeneticVariant[]>([])
const { preview, candidates, busy, error, prepare, confirm, cancel } = useLongevityImport()
const variants = computed(() => candidates.value.filter((item): item is { type: 'variant'; value: LocalGeneticVariant } => item.type === 'variant'))
function refresh() { if (import.meta.client) stored.value = loadLongevityStore(localStorage).variants }
refresh()
function openPicker() { input.value?.click() }
async function toSelectedLocalFile(file: File): Promise<SelectedLocalFile> { return { name: file.name, path: '', mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, contents: new Uint8Array(await file.arrayBuffer()) } }
async function onFile(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (file) await prepare(await toSelectedLocalFile(file)) }
async function confirmImport() { const file = input.value?.files?.[0]; if (file) { await confirm(await toSelectedLocalFile(file)); refresh() } }
</script>
