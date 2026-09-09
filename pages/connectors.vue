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

    <UCard>
      <template #header><div class="font-medium">Google OAuth (Drive + Gmail)</div></template>
      <div class="grid gap-3 md:grid-cols-2">
        <UInput v-model="googleClientId" placeholder="GOOGLE_CLIENT_ID" />
        <UInput v-model="googleClientSecret" placeholder="GOOGLE_CLIENT_SECRET (optional)" type="password" />
        <UInput v-model="driveFolderId" placeholder="Drive folder ID for RAG sync (optional)" class="md:col-span-2" />
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
      <template #header><div class="font-medium">YouTube / podcast → RAG</div></template>
      <p class="text-sm text-zinc-400">
        Paste YouTube links (or video IDs) from biohacking podcasts. Captions are fetched locally and chunked into your document RAG index.
      </p>
      <UTextarea
        v-model="youtubeInput"
        :rows="4"
        placeholder="https://www.youtube.com/watch?v=...&#10;https://youtu.be/..."
        class="mt-3"
      />
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <UInput v-model="youtubeLanguage" placeholder="Caption language (default: en)" class="w-48" />
        <UButton :loading="youtubeSyncBusy" @click="runYouTubeSync(false)">Index transcripts</UButton>
        <UButton variant="outline" :loading="youtubeSyncBusy" @click="runYouTubeSync(true)">Re-index all</UButton>
        <span v-if="youtubeSyncSummary" class="text-sm text-zinc-400">{{ youtubeSyncSummary }}</span>
      </div>
      <ul v-if="youtubeSyncVideos.length" class="mt-3 space-y-1 text-sm text-zinc-300">
        <li v-for="video in youtubeSyncVideos" :key="video.videoId">
          {{ video.title }} · {{ video.chunks }} chunks
        </li>
      </ul>
      <ul v-if="youtubeSyncErrors.length" class="mt-2 space-y-1 text-sm text-amber-400">
        <li v-for="error in youtubeSyncErrors" :key="error.videoId">{{ error.videoId }}: {{ error.message }}</li>
      </ul>
      <p class="mt-3 text-xs text-zinc-500">
        Videos need captions/subtitles. For playlists or Whisper fallback, enable the optional Transcriptor MCP connector (Docker).
      </p>
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
import { defaultGoogleRedirectUri } from '~~/plugins/connectors/oauth/google-oauth'
import { listGmailMessages, type GmailMessageSummary } from '~~/plugins/connectors/adapters/gmail-adapter'
import { syncDrivePdfsToRag } from '~~/plugins/connectors/drive-rag-sync'
import { indexYouTubeUrlsToRag } from '~~/plugins/connectors/youtube-rag-sync'
import type { ConnectorConnectionStatus, ConnectorId } from '~~/plugins/connectors/types'

const { catalog, statuses, busy, error, refresh, toggle, saveCredential, isEnabled } = useConnectors()
const google = useGoogleOAuth()
const credentialDrafts = reactive<Record<string, string>>({})
const googleClientId = ref('')
const googleClientSecret = ref('')
const driveFolderId = ref('')
const redirectUri = defaultGoogleRedirectUri()
const youtubeInput = ref('')
const youtubeLanguage = ref('en')
const youtubeSyncBusy = ref(false)
const youtubeSyncSummary = ref('')
const youtubeSyncVideos = ref<Array<{ videoId: string; title: string; chunks: number; url: string }>>([])
const youtubeSyncErrors = ref<Array<{ videoId: string; message: string }>>([])
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

async function connectGoogle(connectorIds: Array<'google-drive' | 'gmail'>) {
  await saveGoogleConfig()
  await google.startOAuth(connectorIds)
}

async function runYouTubeSync(force: boolean) {
  youtubeSyncBusy.value = true
  youtubeSyncSummary.value = ''
  youtubeSyncVideos.value = []
  youtubeSyncErrors.value = []
  try {
    const result = await indexYouTubeUrlsToRag({
      text: youtubeInput.value,
      language: youtubeLanguage.value.trim() || 'en',
      force,
    })
    youtubeSyncVideos.value = result.videos
    youtubeSyncErrors.value = result.errors
    youtubeSyncSummary.value = `Indexed ${result.indexed}, skipped ${result.skipped}, failed ${result.failed}.`
  } catch (cause) {
    youtubeSyncSummary.value = cause instanceof Error ? cause.message : 'YouTube ingest failed'
  } finally {
    youtubeSyncBusy.value = false
  }
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
