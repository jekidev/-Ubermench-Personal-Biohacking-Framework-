<script setup lang="ts">
import { screenProfileSafety } from '~/services/profile-safety'
import { biomarkersToPhenotypicInputs, computePhenotypicAge } from '~/services/phenotypic-age-engine'
import { buildLongitudinalDashboard } from '~/services/longitudinal-dashboard'
import type { SafetySeverity } from '~/services/safety-engine'

const { profile, initialize, interactionFlags, exportBackup, importBackup, previewImport, exportEncryptedBackup, importEncryptedBackup, exportBackupToFile, importBackupFromFile } = usePersonalBiology()
const { selectModel, evidenceQuery } = useBiohackingAI()
const chronologicalAge = ref(35)

const importInput = ref<HTMLInputElement | null>(null)
const encryptedImportInput = ref<HTMLInputElement | null>(null)
const backupMessage = ref('')
const backupError = ref('')
const encryptedPassphrase = ref('')
const encryptedImportPassphrase = ref('')
const backupPreview = ref<Awaited<ReturnType<typeof previewImport>> | null>(null)

onMounted(initialize)

const models = computed(() => ({
  genomics: selectModel('genomics')?.name ?? 'Unavailable',
  biomedical: selectModel('biomedical')?.name ?? 'Unavailable',
  molecular: selectModel('molecular')?.name ?? 'Unavailable',
}))

const flags = computed(() => interactionFlags())
const safetyFlags = computed(() => screenProfileSafety(profile.value))
const longitudinal = computed(() => buildLongitudinalDashboard(profile.value))
const goalQuery = computed(() => evidenceQuery(profile.value.goals[0] ?? 'personal health optimization'))

function safetyColor(severity: SafetySeverity) {
  if (severity === 'red') return 'error'
  if (severity === 'orange' || severity === 'yellow') return 'warning'
  return 'success'
}
const phenotypicAge = computed(() => computePhenotypicAge(biomarkersToPhenotypicInputs(profile.value.biomarkers, chronologicalAge.value)))

function resetBackupStatus() {
  backupError.value = ''
  backupMessage.value = ''
}

async function downloadBackup() {
  resetBackupStatus()
  const blob = new Blob([await exportBackup()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `ubermench-biology-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
  backupMessage.value = 'Biology backup exported with checksum metadata.'
}

async function downloadNativeBackup() {
  resetBackupStatus()
  try {
    const path = await exportBackupToFile()
    backupMessage.value = path ? `Backup saved to ${path}` : 'Native export cancelled.'
  } catch (error) {
    backupError.value = error instanceof Error ? error.message : 'Native export failed.'
  }
}

async function importNativeBackup() {
  resetBackupStatus()
  try {
    const imported = await importBackupFromFile()
    backupMessage.value = imported ? 'Native biology backup imported.' : 'Native import cancelled.'
  } catch (error) {
    backupError.value = error instanceof Error ? error.message : 'Native import failed.'
  }
}

async function downloadEncryptedBackup() {
  resetBackupStatus()
  if (encryptedPassphrase.value.length < 12) {
    backupError.value = 'Use an encrypted-backup passphrase of at least 12 characters.'
    return
  }
  try {
    const raw = await exportEncryptedBackup(encryptedPassphrase.value)
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `ubermench-biology-encrypted-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    encryptedPassphrase.value = ''
    backupMessage.value = 'Encrypted biology backup exported. Store the passphrase separately; it cannot be recovered by the app.'
  } catch (error) {
    backupError.value = error instanceof Error ? error.message : 'Unable to export encrypted biology backup.'
  }
}

async function handleBackupFile(event: Event) {
  resetBackupStatus()
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const raw = await file.text()
    backupPreview.value = await previewImport(raw)
    await importBackup(raw, { force: true })
    backupMessage.value = `Biology backup imported. Checksum ${backupPreview.value.checksum?.slice(0, 12)}…`
  } catch (error) {
    backupError.value = error instanceof Error ? error.message : 'Unable to import biology backup.'
  } finally {
    input.value = ''
  }
}

async function handleEncryptedBackupFile(event: Event) {
  resetBackupStatus()
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (encryptedImportPassphrase.value.length < 12) {
    backupError.value = 'Enter the passphrase used to create this encrypted backup.'
    input.value = ''
    return
  }
  try {
    await importEncryptedBackup(await file.text(), encryptedImportPassphrase.value)
    encryptedImportPassphrase.value = ''
    backupMessage.value = 'Encrypted biology backup decrypted, validated and restored.'
  } catch (error) {
    backupError.value = error instanceof Error ? error.message : 'Unable to decrypt encrypted biology backup.'
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
      <UCard><p class="text-sm text-muted">Safety flags</p><p class="text-2xl font-semibold">{{ safetyFlags.filter((flag) => flag.requiresReview).length }}</p></UCard>
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <UCard><p class="text-sm font-semibold">Genomics route</p><p class="mt-2 text-sm text-muted">{{ models.genomics }}</p></UCard>
      <UCard><p class="text-sm font-semibold">Biomedical route</p><p class="mt-2 text-sm text-muted">{{ models.biomedical }}</p></UCard>
      <UCard><p class="text-sm font-semibold">Molecular route</p><p class="mt-2 text-sm text-muted">{{ models.molecular }}</p></UCard>
    </div>

    <UCard>
      <h2 class="font-semibold">Phenotypic age (research estimate)</h2>
      <div class="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label class="text-sm text-muted">Chronological age</label>
          <UInput v-model.number="chronologicalAge" type="number" min="18" max="120" class="mt-1 w-32" />
        </div>
        <div v-if="phenotypicAge.phenotypicAgeYears" class="text-sm">
          Estimate: <span class="font-semibold">{{ phenotypicAge.phenotypicAgeYears }} years</span>
          (Δ {{ phenotypicAge.ageDeltaYears }} years)
        </div>
        <p v-else class="text-sm text-muted">Missing markers: {{ phenotypicAge.missingMarkers.join(', ') }}</p>
      </div>
      <p class="mt-3 text-xs text-muted">{{ phenotypicAge.disclaimer }}</p>
    </UCard>

    <UCard>
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-semibold">Safety screening</h2>
        <NuxtLink to="/safety"><UButton size="sm" variant="outline">Open safety</UButton></NuxtLink>
      </div>
      <p class="mt-1 text-sm text-muted">Duplicate ingredients, cumulative dose and interaction rules. Kept separate from efficacy ranking.</p>
      <div v-if="safetyFlags.length" class="mt-4 space-y-2 text-sm">
        <div v-for="(flag, index) in safetyFlags" :key="`${flag.code}-${index}`" class="flex justify-between gap-3 border-b border-default py-2">
          <span>{{ flag.title }}</span>
          <UBadge :color="safetyColor(flag.severity)" variant="subtle">{{ flag.severity }}</UBadge>
        </div>
      </div>
    </UCard>

    <UCard>
      <h2 class="font-semibold">Interaction flags</h2>
      <div v-if="flags.length" class="mt-4 space-y-2 text-sm">
        <div v-for="flag in flags" :key="flag.subject" class="flex justify-between gap-3 border-b border-default py-2">
          <span>{{ flag.subject }}</span>
          <span class="text-muted">{{ flag.severity }}</span>
        </div>
      </div>
      <p v-else class="mt-3 text-sm text-muted">No interaction flags from the current medication list.</p>
    </UCard>

    <UCard>
      <h2 class="font-semibold">Portable biology backup</h2>
      <p class="mt-1 text-sm text-muted">Export or restore the complete local biology profile as a versioned JSON backup.</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <UButton @click="downloadBackup">Export backup</UButton>
        <UButton variant="outline" @click="importInput?.click()">Import backup</UButton>
        <UButton variant="outline" @click="downloadNativeBackup">Export (native dialog)</UButton>
        <UButton variant="outline" @click="importNativeBackup">Import (native dialog)</UButton>
        <input ref="importInput" class="hidden" type="file" accept="application/json,.json" @change="handleBackupFile">
      </div>

      <div class="mt-6 border-t border-default pt-6">
        <h3 class="font-semibold">Encrypted recovery snapshot</h3>
        <p class="mt-1 text-sm text-muted">Password-protect the biology snapshot with AES-256-GCM. The app does not store or recover this passphrase.</p>
        <div class="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <UInput v-model="encryptedPassphrase" type="password" autocomplete="new-password" placeholder="Passphrase (12+ characters)" aria-label="Encrypted backup passphrase" />
          <UButton :disabled="encryptedPassphrase.length < 12" @click="downloadEncryptedBackup">Export encrypted</UButton>
        </div>
        <div class="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <UInput v-model="encryptedImportPassphrase" type="password" autocomplete="current-password" placeholder="Backup passphrase" aria-label="Encrypted import passphrase" />
          <UButton variant="outline" :disabled="encryptedImportPassphrase.length < 12" @click="encryptedImportInput?.click()">Import encrypted</UButton>
          <input ref="encryptedImportInput" class="hidden" type="file" accept="application/json,.json" @change="handleEncryptedBackupFile">
        </div>
      </div>

      <p v-if="backupMessage" class="mt-3 text-sm text-primary">{{ backupMessage }}</p>
      <p v-if="backupError" class="mt-3 text-sm text-red-500">{{ backupError }}</p>
    </UCard>

    <UCard>
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-semibold">Biomarker trends</h2>
        <NuxtLink to="/longevity/timeline"><UButton size="sm" variant="outline">Open timeline</UButton></NuxtLink>
      </div>
      <p class="mt-1 text-sm text-muted">Direction is first-to-last change only. Rising or falling is not clinical improvement or harm.</p>
      <div v-if="longitudinal.cards.length" class="mt-4 space-y-3">
        <div v-for="card in longitudinal.cards" :key="card.key" class="flex flex-wrap items-center justify-between gap-3 border-b border-default py-3 text-sm">
          <div>
            <div>{{ card.label }}</div>
            <div class="text-xs text-muted">{{ card.summary?.direction ?? 'insufficient-data' }} · {{ card.latestLabel }}</div>
          </div>
          <svg :width="card.sparkline.width" :height="card.sparkline.height" class="text-primary" role="img" :aria-label="`${card.label} sparkline`">
            <path :d="card.sparkline.path" fill="none" stroke="currentColor" stroke-width="1.5" />
          </svg>
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
