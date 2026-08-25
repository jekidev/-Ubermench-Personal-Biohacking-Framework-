<script setup lang="ts">
const { profile, initialize, biomarkerNames, trend, interactionFlags, exportBackup, importBackup } = usePersonalBiology()
const { selectModel, evidenceQuery } = useBiohackingAI()

const importInput = ref<HTMLInputElement | null>(null)
const backupMessage = ref('')
const backupError = ref('')

onMounted(initialize)

const models = computed(() => ({
  genomics: selectModel('genomics')?.name ?? 'Unavailable',
  biomedical: selectModel('biomedical')?.name ?? 'Unavailable',
  molecular: selectModel('molecular')?.name ?? 'Unavailable',
}))

const trends = computed(() => biomarkerNames().map((name) => trend(name)))
const flags = computed(() => interactionFlags())
const goalQuery = computed(() => evidenceQuery(profile.value.goals[0] ?? 'personal health optimization'))

function downloadBackup() {
  backupError.value = ''
  backupMessage.value = ''
  const blob = new Blob([exportBackup()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `ubermench-biology-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
  backupMessage.value = 'Biology backup exported.'
}

async function handleBackupFile(event: Event) {
  backupError.value = ''
  backupMessage.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    await importBackup(await file.text())
    backupMessage.value = 'Biology backup imported.'
  } catch (error) {
    backupError.value = error instanceof Error ? error.message : 'Unable to import biology backup.'
  } finally {
    input.value = ''
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-8 px-6 py-10">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Personal Biology</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">Biology Intelligence</h1>
      <p class="mt-2 max-w-3xl text-muted">Local-first profile, longitudinal biomarkers, safety screening and model routing.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <UCard><p class="text-sm text-muted">Biomarkers</p><p class="text-2xl font-semibold">{{ profile.biomarkers.length }}</p></UCard>
      <UCard><p class="text-sm text-muted">Variants</p><p class="text-2xl font-semibold">{{ profile.variants.length }}</p></UCard>
      <UCard><p class="text-sm text-muted">Active medications</p><p class="text-2xl font-semibold">{{ profile.medications.filter((x) => x.active).length }}</p></UCard>
      <UCard><p class="text-sm text-muted">Safety flags</p><p class="text-2xl font-semibold">{{ flags.length }}</p></UCard>
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <UCard><p class="text-sm font-semibold">Genomics route</p><p class="mt-2 text-sm text-muted">{{ models.genomics }}</p></UCard>
      <UCard><p class="text-sm font-semibold">Biomedical route</p><p class="mt-2 text-sm text-muted">{{ models.biomedical }}</p></UCard>
      <UCard><p class="text-sm font-semibold">Molecular route</p><p class="mt-2 text-sm text-muted">{{ models.molecular }}</p></UCard>
    </div>

    <UCard>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-semibold">Portable biology backup</h2>
          <p class="mt-1 text-sm text-muted">Export or restore the complete local biology profile as a versioned JSON backup.</p>
        </div>
        <div class="flex gap-2">
          <UButton @click="downloadBackup">Export backup</UButton>
          <UButton variant="outline" @click="importInput?.click()">Import backup</UButton>
          <input ref="importInput" class="hidden" type="file" accept="application/json,.json" @change="handleBackupFile">
        </div>
      </div>
      <p v-if="backupMessage" class="mt-3 text-sm text-primary">{{ backupMessage }}</p>
      <p v-if="backupError" class="mt-3 text-sm text-red-500">{{ backupError }}</p>
    </UCard>

    <UCard>
      <h2 class="font-semibold">Biomarker trends</h2>
      <div v-if="trends.length" class="mt-4 divide-y divide-default">
        <div v-for="item in trends" :key="item.name" class="flex items-center justify-between py-3 text-sm">
          <span>{{ item.name }}</span>
          <span class="text-muted">{{ item.direction }} · {{ item.percentChange === undefined ? '—' : `${item.percentChange.toFixed(1)}%` }}</span>
        </div>
      </div>
      <p v-else class="mt-3 text-sm text-muted">No biomarker records yet. Import or enter laboratory data to activate longitudinal analysis.</p>
    </UCard>

    <UCard>
      <h2 class="font-semibold">Evidence query</h2>
      <p class="mt-2 break-words font-mono text-xs text-muted">{{ goalQuery }}</p>
    </UCard>
  </div>
</template>
