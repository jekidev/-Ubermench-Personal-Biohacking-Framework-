<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Bloods</h1>
        <p class="text-zinc-500">Upload lab PDFs/CSV, review biomarkers, index for RAG, and sync confirmed values to Biology.</p>
      </div>
      <UButton :loading="busy" @click="openPicker">Add blood test</UButton>
    </div>

    <input ref="input" type="file" class="hidden" accept=".pdf,.csv,.tsv,.json" @change="onFile" />

    <UCard>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="font-medium">Import options</h2>
          <p class="text-sm text-zinc-500">Use LLM assist only when regex parsing finds few markers. Values always require review.</p>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="useLlmAssist" type="checkbox" />
          LLM assist fallback
        </label>
      </div>
    </UCard>

    <UAlert v-if="error" title="Import error" :description="error" color="error" variant="subtle" />

    <UCard v-if="preview">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">Import preview</span>
          <UBadge variant="subtle">{{ preview.kind }}</UBadge>
        </div>
      </template>
      <div class="grid gap-3 text-sm md:grid-cols-2">
        <div><span class="text-zinc-500">File</span><div>{{ preview.document.filename }}</div></div>
        <div><span class="text-zinc-500">Format</span><div>{{ preview.format }}</div></div>
        <div><span class="text-zinc-500">SHA-256</span><div class="break-all font-mono text-xs">{{ preview.document.sha256 }}</div></div>
        <div><span class="text-zinc-500">Candidates</span><div>{{ observations.length }}</div></div>
      </div>
      <UAlert v-if="preview.warnings.length" class="mt-4" title="Review required" :description="preview.warnings.join(' • ')" color="warning" variant="subtle" />
      <div v-if="observations.length" class="mt-4 space-y-2">
        <div v-for="item in observations" :key="item.value.id" class="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm">
          <span>{{ item.value.biomarker }}</span>
          <span>{{ item.value.value }} {{ item.value.unit }} · {{ item.value.collectedAt }}</span>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="cancel">Cancel</UButton>
          <UButton :disabled="!observations.length" @click="confirmImport">Confirm import</UButton>
        </div>
      </template>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Ask your lab documents (RAG)</div></template>
      <div class="flex gap-2">
        <input v-model="ragQuery" class="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="e.g. What was my CRP in the latest blood test?" />
        <UButton :loading="ragBusy" @click="runRagQuery">Ask</UButton>
      </div>
      <p v-if="ragAnswer" class="mt-4 whitespace-pre-wrap text-sm text-zinc-300">{{ ragAnswer }}</p>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Biomarker timeline</div></template>
      <div v-if="!stored.length" class="text-sm text-zinc-500">No confirmed observations yet.</div>
      <div v-else class="space-y-3">
        <div v-for="item in stored" :key="item.id" class="flex justify-between border-b border-zinc-800 pb-3 text-sm">
          <span>{{ item.biomarker }}</span>
          <span>{{ item.value }} {{ item.unit }} · {{ item.collectedAt }}</span>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { loadLongevityStore, type LocalObservation } from '~/plugins/longevity/persistence/local-store'
import { useLongevityImport } from '~/plugins/longevity/app/use-longevity-import'
import type { SelectedLocalFile } from '~/plugins/longevity/tauri/file-adapter'

const input = ref<HTMLInputElement>()
const stored = ref<LocalObservation[]>([])
const useLlmAssist = ref(false)
const ragQuery = ref('')
const ragAnswer = ref('')
const ragBusy = ref(false)
const { askWithDocuments } = useBiohackingAI()
const { preview, candidates, busy, error, prepare, confirm, cancel } = useLongevityImport()
const observations = computed(() => candidates.value.filter((item): item is { type: 'observation'; value: LocalObservation } => item.type === 'observation'))

function refresh() {
  if (import.meta.client) stored.value = loadLongevityStore(localStorage).observations
}

refresh()

function openPicker() {
  input.value?.click()
}

async function toSelectedLocalFile(file: File): Promise<SelectedLocalFile> {
  return {
    name: file.name,
    path: '',
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    contents: new Uint8Array(await file.arrayBuffer()),
  }
}

async function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const selected = await toSelectedLocalFile(file)
  await prepare(selected, {
    useLlmAssist: useLlmAssist.value,
    llmRunner: useLlmAssist.value
      ? async (prompt, system) => {
          const response = await askWithDocuments({ prompt, system, mode: 'biohacker' })
          return response.text
        }
      : undefined,
  })
}

async function confirmImport() {
  const file = input.value?.files?.[0]
  if (file) {
    await confirm(await toSelectedLocalFile(file))
    refresh()
  }
}

async function runRagQuery() {
  if (!ragQuery.value.trim()) return
  ragBusy.value = true
  ragAnswer.value = ''
  try {
    const response = await askWithDocuments({
      prompt: ragQuery.value,
      mode: 'biohacker',
      system: 'Answer using only indexed local lab documents and confirmed biology profile data.',
    }, ragQuery.value)
    ragAnswer.value = response.text
  } catch (cause) {
    ragAnswer.value = cause instanceof Error ? cause.message : 'RAG query failed'
  } finally {
    ragBusy.value = false
  }
}
</script>
