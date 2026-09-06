<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Connectors</h1>
        <p class="text-zinc-500">Cursor-style integrations. Google OAuth, Drive RAG sync, and MCP bridges use the secret vault.</p>
      </div>
      <UButton :loading="busy" @click="refresh">Refresh</UButton>
    </div>

    <UAlert v-if="error" title="Connector error" :description="error" color="error" variant="subtle" />
    <UAlert v-if="google.error.value" title="Google OAuth" :description="google.error.value" color="warning" variant="subtle" />
    <UAlert
      v-if="isAndroidBrowserRef"
      title="Android browser"
      description="Google tokens now persist in localStorage on mobile. Use Chrome (not an in-app WebView) for OAuth if Google blocks sign-in."
      color="primary"
      variant="subtle"
    />

    <UCard>
      <template #header><div class="font-medium">Google OAuth (Drive + Gmail)</div></template>
      <div class="grid gap-3 md:grid-cols-2">
        <UInput v-model="googleClientId" placeholder="GOOGLE_CLIENT_ID" />
        <UInput v-model="googleClientSecret" placeholder="GOOGLE_CLIENT_SECRET (optional)" type="password" />
        <UInput v-model="driveFolderId" placeholder="Drive folder ID for RAG sync (optional)" class="md:col-span-2" />
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <input ref="googleJsonInput" type="file" accept="application/json,.json" class="hidden" @change="onGoogleJsonSelected" />
        <UButton variant="outline" @click="googleJsonInput?.click()">Import client JSON</UButton>
        <span class="text-xs text-zinc-500">Upload the OAuth JSON from Google Cloud (never commit it to git).</span>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <UButton :loading="google.busy.value" @click="saveGoogleConfig">Save Google config</UButton>
        <UButton :loading="google.busy.value" @click="connectGoogle(['google-drive', 'gmail'])">Connect Drive + Gmail</UButton>
        <UButton variant="outline" :loading="google.busy.value" @click="connectGoogle(['google-drive'])">Connect Drive only</UButton>
        <UButton variant="outline" :loading="google.busy.value" @click="connectGoogle(['gmail'])">Connect Gmail only</UButton>
      </div>
      <p class="mt-3 text-xs text-zinc-500">
        Redirect URI: <code>{{ redirectUri }}</code> — add this in Google Cloud Console OAuth credentials.
      </p>
      <p class="mt-1 text-xs text-zinc-500">Connected: {{ google.connected.value ? 'yes' : 'no' }}</p>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Google Drive → RAG sync</div></template>
      <p class="text-sm text-zinc-400">Downloads new PDFs from Drive, extracts text, and indexes chunks for document Q&A.</p>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <UButton :loading="driveSyncBusy" @click="runDriveSync">Sync PDFs to RAG</UButton>
        <span v-if="driveSyncSummary" class="text-sm text-zinc-400">{{ driveSyncSummary }}</span>
      </div>
      <ul v-if="driveSyncFiles.length" class="mt-3 space-y-1 text-sm text-zinc-300">
        <li v-for="file in driveSyncFiles" :key="file.id">{{ file.name }} · {{ file.chunks }} chunks</li>
      </ul>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Gmail preview</div></template>
      <UButton size="sm" :loading="gmailBusy" @click="loadGmail">Load recent messages</UButton>
      <ul v-if="gmailMessages.length" class="mt-3 space-y-2 text-sm">
        <li v-for="message in gmailMessages" :key="message.id" class="rounded border border-zinc-800 p-3">
          <div class="font-medium">{{ message.subject }}</div>
          <div class="text-xs text-zinc-500">{{ message.from }}</div>
          <div class="mt-1 text-zinc-400">{{ message.snippet }}</div>
        </li>
      </ul>
    </UCard>

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard v-for="connector in catalog" :key="connector.id">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="font-medium">{{ connector.name }}</div>
              <div class="text-xs text-zinc-500">{{ connector.category }} · {{ connector.transport }}</div>
            </div>
            <UBadge :color="statusColor(statusFor(connector.id)?.status)" variant="subtle">
              {{ statusFor(connector.id)?.status ?? 'unknown' }}
            </UBadge>
          </div>
        </template>

        <p class="text-sm text-zinc-400">{{ connector.description }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UBadge v-for="capability in connector.capabilities" :key="capability" variant="subtle">{{ capability }}</UBadge>
        </div>

        <div class="mt-4 space-y-2">
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              :checked="isEnabled(connector.id)"
              @change="toggle(connector.id, ($event.target as HTMLInputElement).checked)"
            />
            Enabled
          </label>
          <p class="text-xs text-zinc-500">Implementation: {{ connector.status }} · Cursor parity: {{ connector.cursorParity ? 'yes' : 'no' }}</p>
          <div v-if="connector.auth.envKeys?.length && !isGoogleConnector(connector.id)" class="space-y-2">
            <div v-for="key in connector.auth.envKeys" :key="key" class="flex gap-2">
              <UInput v-model="credentialDrafts[key]" :placeholder="key" type="password" class="flex-1" />
              <UButton size="sm" @click="saveKey(key)">Save</UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defaultGoogleRedirectUri } from '../../plugins/connectors/oauth/google-oauth'
import { listGmailMessages, type GmailMessageSummary } from '../../plugins/connectors/adapters/gmail-adapter'
import { syncDrivePdfsToRag } from '../../plugins/connectors/drive-rag-sync'
import type { ConnectorConnectionStatus, ConnectorId } from '../../plugins/connectors/types'
import { isAndroidBrowser } from '../../app/utils/runtime-platform'

const isAndroidBrowserRef = computed(() => isAndroidBrowser())

const { catalog, statuses, busy, error, refresh, toggle, saveCredential, isEnabled } = useConnectors()
const google = useGoogleOAuth()
const googleJsonInput = ref<HTMLInputElement>()
const credentialDrafts = reactive<Record<string, string>>({})
const googleClientId = ref('')
const googleClientSecret = ref('')
const driveFolderId = ref('')
const redirectUri = defaultGoogleRedirectUri()
const driveSyncBusy = ref(false)
const driveSyncSummary = ref('')
const driveSyncFiles = ref<Array<{ id: string; name: string; chunks: number }>>([])
const gmailBusy = ref(false)
const gmailMessages = ref<GmailMessageSummary[]>([])

onMounted(async () => {
  googleClientId.value = await google.loadClientId()
  await google.refreshStatus()
  await refresh()
})

function statusFor(id: ConnectorId) {
  return statuses.value.find((item) => item.id === id)
}

function isGoogleConnector(id: ConnectorId) {
  return id === 'gmail' || id === 'google-drive'
}

function statusColor(status?: ConnectorConnectionStatus) {
  if (status === 'connected') return 'success'
  if (status === 'configured') return 'primary'
  if (status === 'missing-credentials') return 'warning'
  if (status === 'disabled') return 'neutral'
  return 'error'
}

async function saveGoogleConfig() {
  if (googleClientId.value.trim()) await google.saveClientId(googleClientId.value.trim())
  if (googleClientSecret.value.trim()) await google.saveClientSecret(googleClientSecret.value.trim())
  if (driveFolderId.value.trim()) await google.saveDriveFolderId(driveFolderId.value.trim())
  await refresh()
}

async function onGoogleJsonSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const parsed = await google.importClientJson(await file.text())
    googleClientId.value = parsed.clientId
    googleClientSecret.value = parsed.clientSecret ?? ''
    await refresh()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Failed to import Google client JSON'
  } finally {
    if (googleJsonInput.value) googleJsonInput.value.value = ''
  }
}

async function connectGoogle(connectorIds: Array<'google-drive' | 'gmail'>) {
  await saveGoogleConfig()
  await google.startOAuth(connectorIds)
}

async function runDriveSync() {
  driveSyncBusy.value = true
  driveSyncSummary.value = ''
  driveSyncFiles.value = []
  try {
    const result = await syncDrivePdfsToRag({ folderId: driveFolderId.value || undefined })
    driveSyncFiles.value = result.files
    driveSyncSummary.value = `Indexed ${result.indexed} PDFs, skipped ${result.skipped}.`
  } catch (cause) {
    driveSyncSummary.value = cause instanceof Error ? cause.message : 'Drive sync failed'
  } finally {
    driveSyncBusy.value = false
  }
}

async function loadGmail() {
  gmailBusy.value = true
  try {
    gmailMessages.value = await listGmailMessages(8)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Gmail load failed'
  } finally {
    gmailBusy.value = false
  }
}

async function saveKey(key: string) {
  const value = credentialDrafts[key]
  if (!value?.trim()) return
  await saveCredential(key, value.trim())
  credentialDrafts[key] = ''
}
</script>
