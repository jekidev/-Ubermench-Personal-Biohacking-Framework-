<template>
  <div class="space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Health sync</p>
      <h1 class="mt-2 text-2xl font-semibold">Garmin & Health Connect</h1>
      <p class="mt-2 text-sm text-zinc-500">
        Supported providers only. Garmin accepts a Wellness JSON export or a vault-stored access token.
        The adapter never invents measurements. Health Connect requires the native Android app.
      </p>
    </div>

    <UAlert
      v-if="hcMode === 'browser-blocked'"
      title="Android browser detected"
      :description="healthConnectBrowserMessage"
      color="warning"
      variant="subtle"
    />

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard>
        <template #header><div class="font-medium">Garmin Wellness import</div></template>
        <p class="text-sm text-zinc-400">
          Paste or upload Garmin Wellness API JSON (`dailies`, `sleeps`, `hrv`, `bodyComps`, `pulseOx`, `activities`).
          This is the Android path when you do not have a Garmin developer client. Oura, WHOOP and Apple Health payloads are rejected.
        </p>
        <textarea
          v-model="garminJson"
          class="mt-3 min-h-36 w-full rounded-md border border-zinc-800 bg-transparent p-3 text-sm"
          placeholder='{"provider":"garmin","dailies":[{"calendarDate":"2026-09-06","restingHeartRate":52,"steps":8432}]}'
        />
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <input type="file" accept="application/json,.json" class="text-xs text-zinc-400" @change="onGarminFile" />
          <UButton :loading="garminBusy" :disabled="!garminJson.trim()" @click="importGarmin">Import JSON</UButton>
          <UButton color="neutral" variant="outline" :loading="garminBusy" @click="connectAndSync('garmin')">Sync imported / authorized</UButton>
        </div>
        <p v-if="garminStatus" class="mt-3 text-sm text-zinc-400">{{ garminStatus }}</p>
        <p v-if="garminError" class="mt-3 text-sm text-red-400">{{ garminError }}</p>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Garmin OAuth (Wellness API)</div></template>
        <p class="text-sm text-zinc-400">
          Optional. Connect with PKCE using your Garmin Connect Developer client ID and secret.
          If mobile Chrome blocks the redirect, keep using JSON import above — OAuth is not required and is not simulated.
        </p>
        <div class="mt-3 grid gap-3">
          <UInput v-model="garminClientId" placeholder="Garmin client ID" />
          <UInput v-model="garminClientSecret" type="password" placeholder="Garmin client secret" autocomplete="off" />
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <UButton variant="outline" :loading="garminOAuth.busy.value" @click="saveGarminOAuthConfig">Save OAuth config</UButton>
          <UButton :loading="garminOAuth.busy.value" @click="connectGarminOAuth">Connect Garmin</UButton>
        </div>
        <p class="mt-3 text-xs text-zinc-500">
          Redirect URI: <code>{{ garminOAuth.redirectUri }}</code>
          · Configured {{ garminOAuth.configured.value ? 'yes' : 'no' }}
          · Token {{ garminOAuth.connected.value ? 'present' : 'missing' }}
        </p>
        <div class="mt-3 grid gap-1 text-xs text-zinc-500">
          <div>Plugins Garmin samples: {{ garminPlugin.status.value.observationCount }}</div>
          <div>Last Garmin sample: {{ garminPlugin.status.value.lastObservedAt ? new Date(garminPlugin.status.value.lastObservedAt).toLocaleString() : 'none' }}</div>
        </div>
        <UAlert v-if="garminOAuth.error.value" class="mt-3" title="Garmin OAuth" :description="garminOAuth.error.value" color="warning" variant="subtle" />
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Garmin access token (manual)</div></template>
        <p class="text-sm text-zinc-400">
          Development fallback when OAuth is unavailable. Stored in this browser's local vault on Android Chrome (Stronghold on desktop Tauri).
        </p>
        <UInput v-model="garminToken" type="password" placeholder="Garmin access token" autocomplete="off" class="mt-3" />
        <UButton class="mt-3" :loading="garminBusy" :disabled="!garminToken.trim()" @click="saveGarminToken">Save token to vault</UButton>
        <p v-if="tokenStatus" class="mt-3 text-sm text-zinc-400">{{ tokenStatus }}</p>
      </UCard>
    </div>

    <UCard v-if="importedSamples.length">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <span class="font-medium">Imported Garmin samples</span>
          <span class="text-xs text-zinc-500">{{ importedSamples.length }} records</span>
        </div>
      </template>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-xs uppercase text-zinc-500">
            <tr>
              <th class="py-2 pr-3">Metric</th>
              <th class="py-2 pr-3">Value</th>
              <th class="py-2 pr-3">Recorded</th>
              <th class="py-2">Hash</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sample in importedSamples" :key="sample.id" class="border-t border-zinc-800">
              <td class="py-2 pr-3">{{ sample.metric }}</td>
              <td class="py-2 pr-3">{{ sample.value }} {{ sample.unit }}</td>
              <td class="py-2 pr-3">{{ sample.recordedAt.slice(0, 10) }}</td>
              <td class="py-2 font-mono text-xs text-zinc-500">{{ String(sample.metadata?.payloadHash ?? '').slice(0, 12) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard>
        <template #header><div class="font-medium">Android Health Connect</div></template>
        <p class="text-sm text-zinc-400">
          Native Android app only. Chrome/PWA cannot read Health Connect and will not invent step counts.
        </p>
        <UButton
          class="mt-3"
          :loading="healthConnectBusy"
          :disabled="hcMode === 'browser-blocked'"
          @click="connectAndSync('health-connect')"
        >
          Connect & sync
        </UButton>
        <p v-if="healthConnectStatus" class="mt-3 text-sm text-zinc-400">{{ healthConnectStatus }}</p>
        <p class="mt-3 text-xs text-zinc-500">Runtime mode: {{ hcMode }}</p>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Persist reconciled observations</div></template>
        <p class="text-sm text-zinc-400">Writes canonical observations locally after quality filtering and provider reconciliation.</p>
        <UButton class="mt-3" :loading="persistBusy" @click="syncAllPersisted">Sync available providers & persist</UButton>
        <p v-if="persistedCount" class="mt-3 text-sm text-zinc-400">Last sync wrote {{ persistedCount }} canonical observation(s).</p>
      </UCard>
    </div>

    <UCard>
      <template #header><div class="font-medium">Live Garmin plugin status</div></template>
      <p class="text-sm text-zinc-400">Same cache as Settings → Plugins and <code>plugins.garmin.status</code>.</p>
      <div class="mt-3 grid gap-2 text-sm">
        <div><span class="text-zinc-500">OAuth client:</span> {{ garminPlugin.status.value.oauthConfigured ? 'configured' : 'missing' }}</div>
        <div><span class="text-zinc-500">Access token:</span> {{ garminPlugin.status.value.oauthConnected ? 'present' : 'missing' }}</div>
        <div><span class="text-zinc-500">Persisted samples:</span> {{ garminPlugin.status.value.observationCount }}</div>
        <div><span class="text-zinc-500">Last sample:</span> {{ garminPlugin.status.value.lastObservedAt ? new Date(garminPlugin.status.value.lastObservedAt).toLocaleString() : 'None' }}</div>
      </div>
      <p v-if="garminPlugin.status.value.metrics.length" class="mt-3 text-xs text-zinc-500">
        Synced metrics: {{ garminPlugin.status.value.metrics.join(', ') }}
      </p>
      <UAlert
        v-if="!garminPlugin.status.value.oauthConfigured && !garminPlugin.status.value.oauthConnected && !garminPlugin.status.value.observationCount"
        class="mt-3"
        title="Garmin unconfigured"
        :description="garminPlugin.status.value.nextStep"
        color="warning"
        variant="subtle"
      />
      <p v-else class="mt-3 text-xs text-zinc-400">{{ garminPlugin.status.value.nextStep }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <UButton size="sm" variant="outline" @click="refreshGarminPlugins">Refresh status</UButton>
        <UButton size="sm" variant="ghost" to="/settings?tab=plugins">Open Plugins</UButton>
        <UButton size="sm" variant="ghost" to="/longevity/sleep">Sleep log</UButton>
        <UButton size="sm" variant="ghost" to="/longevity/workouts">Workouts</UButton>
      </div>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Google Drive (lab PDFs)</div></template>
      <p class="text-sm text-zinc-400">
        Drive lab PDFs work in Android Chrome. Register this redirect URI in Google Cloud Console, then connect on Connectors:
        <code class="break-all">{{ redirectUri }}</code>
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <UButton variant="outline" to="/connectors">Connect Drive</UButton>
        <UButton variant="ghost" to="/longevity/bloods">Upload PDF on Bloods</UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ExternalHealthSample } from '~/services/health-data-adapters'
import { detectHealthConnectRuntimeMode } from '~/services/health-adapters/health-connect-adapter'
import {
  createHealthSyncOrchestrator,
  importGarminWellnessAndPersist,
  storeGarminAccessToken,
  syncAndPersistAllHealth,
} from '~/services/health-sync-runtime'
import { defaultGoogleRedirectUri } from '~~/plugins/connectors/oauth/google-oauth'
import { HEALTH_CONNECT_BROWSER_MESSAGE } from '~/services/android-fallbacks'

const garminOAuth = useGarminOAuth()
const garminPlugin = useGarminPluginStatus()
const garminJson = ref('')
const garminToken = ref('')
const garminClientId = ref('')
const garminClientSecret = ref('')
const garminStatus = ref('')
const garminError = ref('')
const tokenStatus = ref('')
const healthConnectStatus = ref('')
const persistedCount = ref(0)
const importedSamples = ref<ExternalHealthSample[]>([])
const garminBusy = ref(false)
const healthConnectBusy = ref(false)
const persistBusy = ref(false)
const hcMode = ref<Awaited<ReturnType<typeof detectHealthConnectRuntimeMode>>>('unavailable')
const redirectUri = defaultGoogleRedirectUri()
const healthConnectBrowserMessage = HEALTH_CONNECT_BROWSER_MESSAGE

onMounted(async () => {
  hcMode.value = await detectHealthConnectRuntimeMode()
  await garminOAuth.refreshStatus()
  await refreshGarminPlugins()
})

async function refreshGarminPlugins() {
  try {
    await garminPlugin.refresh()
  } catch {
    // Plugins Garmin status is best-effort and must not block Health Sync.
  }
}

async function saveGarminOAuthConfig() {
  if (garminClientId.value.trim()) await garminOAuth.saveClientId(garminClientId.value.trim())
  if (garminClientSecret.value.trim()) await garminOAuth.saveClientSecret(garminClientSecret.value.trim())
}

async function connectGarminOAuth() {
  await saveGarminOAuthConfig()
  await garminOAuth.startOAuth()
}

async function onGarminFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  garminJson.value = await file.text()
}

async function importGarmin() {
  garminBusy.value = true
  garminError.value = ''
  garminStatus.value = ''
  try {
    const payload = JSON.parse(garminJson.value) as unknown
    const result = await importGarminWellnessAndPersist(payload)
    importedSamples.value = result.samples
    persistedCount.value = result.observations.length
    garminStatus.value = `Imported ${result.samples.length} Garmin sample(s) and persisted ${result.observations.length} observation(s).`
    await refreshGarminPlugins()
  } catch (error) {
    garminError.value = error instanceof Error ? error.message : String(error)
  } finally {
    garminBusy.value = false
  }
}

async function saveGarminToken() {
  garminBusy.value = true
  tokenStatus.value = ''
  try {
    await storeGarminAccessToken(garminToken.value)
    garminToken.value = ''
    tokenStatus.value = 'Garmin access token stored in the secret vault.'
    await garminOAuth.refreshStatus()
    await refreshGarminPlugins()
  } catch (error) {
    tokenStatus.value = error instanceof Error ? error.message : String(error)
  } finally {
    garminBusy.value = false
  }
}

async function connectAndSync(provider: 'garmin' | 'health-connect') {
  const busy = provider === 'garmin' ? garminBusy : healthConnectBusy
  busy.value = true
  if (provider === 'garmin') garminError.value = ''
  try {
    const orchestrator = createHealthSyncOrchestrator()
    const state = await orchestrator.syncProvider(provider)
    const message = state.state.lastError ?? `Synced ${state.samples.length} samples (${state.observations.length} observations)`
    if (provider === 'garmin') {
      garminStatus.value = message
      if (state.samples.length) importedSamples.value = state.samples
      await refreshGarminPlugins()
    } else {
      healthConnectStatus.value = message
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (provider === 'garmin') garminError.value = message
    else healthConnectStatus.value = message
  } finally {
    busy.value = false
  }
}

async function syncAllPersisted() {
  persistBusy.value = true
  try {
    const result = await syncAndPersistAllHealth()
    persistedCount.value = result.observations.length
    await refreshGarminPlugins()
  } finally {
    persistBusy.value = false
  }
}
</script>
