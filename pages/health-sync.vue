<script setup lang="ts">
import { createHealthSyncOrchestrator, syncAndPersistAllHealth } from '~/services/health-sync-runtime'
import { detectHealthConnectRuntimeMode } from '~/services/health-adapters/health-connect-adapter'
import { defaultGoogleRedirectUri } from '../../plugins/connectors/oauth/google-oauth'

const garminStatus = ref('')
const healthConnectStatus = ref('')
const persistedCount = ref(0)
const hcMode = ref<Awaited<ReturnType<typeof detectHealthConnectRuntimeMode>>>('unavailable')
const redirectUri = defaultGoogleRedirectUri()

onMounted(async () => {
  hcMode.value = await detectHealthConnectRuntimeMode()
})

async function connectAndSync(provider: 'garmin' | 'health-connect') {
  const orchestrator = createHealthSyncOrchestrator()
  try {
    const state = await orchestrator.syncProvider(provider)
    const message = state.state.lastError ?? `Synced ${state.samples.length} samples (${state.observations.length} observations)`
    if (provider === 'garmin') garminStatus.value = message
    else healthConnectStatus.value = message
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (provider === 'garmin') garminStatus.value = message
    else healthConnectStatus.value = message
  }
}

async function syncAllPersisted() {
  const result = await syncAndPersistAllHealth()
  persistedCount.value = result.observations.length
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Health sync</p>
      <h1 class="mt-2 text-3xl font-semibold">Garmin & Health Connect</h1>
      <p class="mt-2 text-muted">On Android, Health Connect requires the native Ubermench app — not Chrome/PWA alone.</p>
    </div>

    <UAlert
      v-if="hcMode === 'browser-blocked'"
      title="Android browser detected"
      description="Health Connect cannot be accessed from Chrome or a PWA. Build and install the Android app with: npm run tauri:android:init then npm run tauri:android:dev"
      color="warning"
      variant="subtle"
    />

    <UCard>
      <h2 class="font-semibold">Android Health Connect</h2>
      <p class="mt-2 text-sm text-muted">
        Syncs steps, heart rate, HRV, resting HR, and sleep from Samsung Health, Google Fit, Garmin (via HC), etc.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <UButton :disabled="hcMode === 'browser-blocked'" @click="connectAndSync('health-connect')">Connect & sync</UButton>
      </div>
      <p v-if="healthConnectStatus" class="mt-3 text-sm text-muted">{{ healthConnectStatus }}</p>
      <p class="mt-3 text-xs text-muted">Runtime mode: {{ hcMode }}</p>
    </UCard>

    <UCard>
      <h2 class="font-semibold">Garmin</h2>
      <p class="mt-2 text-sm text-muted">Garmin OAuth is still on the roadmap. Health Connect can ingest Garmin data if Garmin syncs to Health Connect on your phone.</p>
      <UButton class="mt-4" variant="outline" @click="connectAndSync('garmin')">Connect & sync</UButton>
      <p v-if="garminStatus" class="mt-3 text-sm text-muted">{{ garminStatus }}</p>
    </UCard>

    <UCard>
      <h2 class="font-semibold">Google Drive (lab PDFs)</h2>
      <p class="mt-2 text-sm text-muted">
        Drive sync works in Android Chrome. Use the same redirect URI in Google Cloud Console:
        <code class="break-all">{{ redirectUri }}</code>
      </p>
      <NuxtLink to="/connectors"><UButton class="mt-4" variant="outline">Open Connectors</UButton></NuxtLink>
    </UCard>

    <UCard>
      <h2 class="font-semibold">Persist reconciled observations</h2>
      <UButton class="mt-4" @click="syncAllPersisted">Sync all providers & persist</UButton>
      <p v-if="persistedCount" class="mt-3 text-sm text-muted">Last sync wrote {{ persistedCount }} canonical observation(s).</p>
    </UCard>
  </div>
</template>
