<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Connectors</h1>
        <p class="text-zinc-500">Cursor-style Google OAuth, Drive / Gmail / Calendar tools, and a local MCP install catalog. Credentials stay in the secret vault.</p>
      </div>
      <UButton :loading="busy" @click="refreshAll">Refresh</UButton>
    </div>

    <UAlert v-if="error" title="Connector error" :description="error" color="error" variant="subtle" />
    <UAlert v-if="google.error.value" title="Google OAuth" :description="google.error.value" color="warning" variant="subtle" />
    <UAlert v-if="mcp.error.value" title="MCP install" :description="mcp.error.value" color="warning" variant="subtle" />
    <UAlert
      v-if="isAndroidBrowserRef"
      title="Android browser"
      description="Google tokens persist in localStorage on mobile. Use Chrome (not an in-app WebView) for OAuth if Google blocks sign-in."
      color="primary"
      variant="subtle"
    />

    <UCard>
      <template #header><div class="font-medium">Google Workspace (one OAuth client)</div></template>
      <p class="text-sm text-zinc-400">
        Drive, Gmail, and Calendar share one Google client and token. Paste a client ID or import the client JSON later — no Cloud Console steps are required in this app.
      </p>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <UInput v-model="googleClientId" placeholder="NUXT_PUBLIC_GOOGLE_CLIENT_ID" />
        <UInput v-model="googleClientSecret" placeholder="Client secret (optional for PKCE)" type="password" />
        <UInput v-model="driveFolderId" placeholder="Drive folder ID for RAG sync (optional)" class="md:col-span-2" />
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <input ref="googleJsonInput" type="file" accept="application/json,.json" class="hidden" @change="onGoogleJsonSelected" />
        <UButton variant="outline" @click="googleJsonInput?.click()">Import client JSON</UButton>
        <UButton :loading="google.busy.value" @click="saveGoogleConfig">Save Google config</UButton>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <UButton :loading="google.busy.value" @click="connectGoogle(['google-drive'])">Connect Drive</UButton>
        <UButton :loading="google.busy.value" @click="connectGoogle(['gmail'])">Connect Gmail</UButton>
        <UButton :loading="google.busy.value" @click="connectGoogle(['google-calendar'])">Connect Calendar</UButton>
        <UButton variant="outline" :loading="google.busy.value" @click="connectGoogle(['google-drive', 'gmail', 'google-calendar'])">Connect all three</UButton>
        <UButton color="neutral" variant="outline" @click="google.disconnect()">Disconnect Google</UButton>
      </div>
      <p class="mt-3 text-xs text-zinc-500">
        Redirect URI used at runtime: <code>{{ redirectUri }}</code>
      </p>
      <p class="mt-1 text-xs text-zinc-500">
        Token: {{ google.connected.value ? 'present' : 'not connected' }}
        · Drive {{ google.services.value['google-drive'] ? 'on' : 'off' }}
        · Gmail {{ google.services.value.gmail ? 'on' : 'off' }}
        · Calendar {{ google.services.value['google-calendar'] ? 'on' : 'off' }}
      </p>
      <div class="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
        <span v-for="scope in listedScopes" :key="scope">{{ scope }}</span>
      </div>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">ChatGPT export → RAG</div></template>
      <p class="text-sm text-zinc-400">
        Import your ChatGPT data export (<code>conversations.json</code> or the full <code>.zip</code>).
        Works from Android Chrome when you open this preview URL — pick the file from Downloads or Google Drive.
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref="chatgptExportInput"
          type="file"
          accept=".json,.zip,application/json,application/zip"
          class="hidden"
          @change="onChatGptExportSelected"
        />
        <UButton :loading="chatgptIngestBusy" @click="chatgptExportInput?.click()">Upload ChatGPT export</UButton>
        <UButton variant="outline" :loading="chatgptIngestBusy" @click="reindexChatGptExport">Re-index all</UButton>
        <span v-if="chatgptIngestSummary" class="text-sm text-zinc-400">{{ chatgptIngestSummary }}</span>
      </div>
      <ul v-if="chatgptIngestConversations.length" class="mt-3 space-y-1 text-sm text-zinc-300">
        <li v-for="conversation in chatgptIngestConversations" :key="conversation.id">
          {{ conversation.title }} · {{ conversation.messages }} messages · {{ conversation.chunks }} chunks
        </li>
      </ul>
      <ul v-if="chatgptIngestErrors.length" class="mt-2 space-y-1 text-sm text-amber-400">
        <li v-for="item in chatgptIngestErrors" :key="item.id">{{ item.id }}: {{ item.message }}</li>
      </ul>
      <p class="mt-3 text-xs text-zinc-500">
        Cloud agents cannot read your phone storage directly. Connect Google Drive above and sync, or upload the export file here.
      </p>
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
        <li v-for="item in youtubeSyncErrors" :key="item.videoId">{{ item.videoId }}: {{ item.message }}</li>
      </ul>
      <p class="mt-3 text-xs text-zinc-500">
        Videos need captions/subtitles. For playlists or Whisper fallback, enable the optional Transcriptor MCP connector (Docker).
      </p>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">YouTube OAuth + scheduler</div></template>
      <p class="text-sm text-zinc-400">
        Connect YouTube (Google OAuth with youtube.readonly) to sync subscriptions. Schedule playlists/channels for automatic RAG ingest.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <UButton :loading="google.busy.value" @click="connectYouTube">Connect YouTube</UButton>
        <UButton variant="outline" :loading="scheduler.running.value" @click="runSchedulerNow">Run scheduler now</UButton>
      </div>
      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="scheduler.store.value.enabled" @change="scheduler.setEnabled(($event.target as HTMLInputElement).checked)" />
          Scheduler enabled
        </label>
        <UInput
          :model-value="String(scheduler.store.value.intervalHours)"
          type="number"
          min="1"
          placeholder="Interval hours"
          @update:model-value="scheduler.setIntervalHours(Number($event) || 168)"
        />
        <span class="text-xs text-zinc-500 self-center">Default: 168h (weekly)</span>
      </div>
      <div class="mt-4 grid gap-3 md:grid-cols-4">
        <UInput v-model="scheduleLabel" placeholder="Label" />
        <select v-model="scheduleType" class="rounded-md border border-zinc-800 bg-transparent px-3 py-2 text-sm">
          <option value="playlist">Playlist</option>
          <option value="channel">Channel</option>
          <option value="subscriptions">Subscriptions (OAuth)</option>
        </select>
        <UInput v-model="scheduleUrl" placeholder="Playlist/channel URL" class="md:col-span-2" />
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <UInput v-model="scheduleMaxVideos" type="number" min="1" max="25" placeholder="Max videos" class="w-32" />
        <UButton size="sm" @click="addScheduleSource">Add source</UButton>
        <span v-if="scheduler.lastResult.value" class="text-sm text-zinc-400">{{ scheduler.lastResult.value }}</span>
      </div>
      <ul v-if="scheduler.store.value.sources.length" class="mt-3 space-y-2 text-sm">
        <li v-for="source in scheduler.store.value.sources" :key="source.id" class="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-800 p-2">
          <div>
            <div class="font-medium">{{ source.label }} · {{ source.type }}</div>
            <div class="text-xs text-zinc-500">{{ source.url || 'OAuth subscriptions' }} · max {{ source.maxVideos }}</div>
          </div>
          <UButton size="xs" variant="ghost" @click="scheduler.removeSource(source.id)">Remove</UButton>
        </li>
      </ul>
      <p v-if="scheduler.store.value.lastRunAt" class="mt-3 text-xs text-zinc-500">
        Last run: {{ scheduler.store.value.lastRunAt }} — {{ scheduler.store.value.lastRunSummary }}
      </p>
    </UCard>

    <div class="grid gap-4 lg:grid-cols-3">
      <UCard>
        <template #header><div class="font-medium">Google Drive</div></template>
        <p class="text-sm text-zinc-400">Search files or sync PDFs into local RAG.</p>
        <p v-if="statusFor('google-drive')?.lastSyncAt" class="mt-2 text-xs text-zinc-500">Last sync {{ statusFor('google-drive')?.lastSyncAt }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UInput v-model="driveQuery" placeholder="Search Drive" class="flex-1" />
          <UButton size="sm" :loading="driveBusy" @click="runDriveSearch">Search</UButton>
          <UButton size="sm" variant="outline" :loading="driveSyncBusy" @click="runDriveSync">Sync PDFs</UButton>
        </div>
        <p v-if="driveSyncSummary" class="mt-2 text-sm text-zinc-400">{{ driveSyncSummary }}</p>
        <ul v-if="driveFiles.length" class="mt-3 space-y-1 text-sm text-zinc-300">
          <li v-for="file in driveFiles" :key="file.id">{{ file.name }} · {{ file.mimeType }}</li>
        </ul>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Gmail</div></template>
        <p class="text-sm text-zinc-400">Search is read-only. Sending stays behind the agent approval gate.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UInput v-model="gmailQuery" placeholder="Search mail" class="flex-1" />
          <UButton size="sm" :loading="gmailBusy" @click="loadGmail">Search</UButton>
        </div>
        <ul v-if="gmailMessages.length" class="mt-3 space-y-2 text-sm">
          <li v-for="message in gmailMessages" :key="message.id" class="rounded border border-zinc-800 p-3">
            <div class="font-medium">{{ message.subject }}</div>
            <div class="text-xs text-zinc-500">{{ message.from }}</div>
            <div class="mt-1 text-zinc-400">{{ message.snippet }}</div>
          </li>
        </ul>
      </UCard>

      <UCard>
        <template #header><div class="font-medium">Google Calendar</div></template>
        <p class="text-sm text-zinc-400">List upcoming events after Calendar is connected.</p>
        <UButton size="sm" class="mt-3" :loading="calendarBusy" @click="loadCalendar">Load events</UButton>
        <ul v-if="calendarEvents.length" class="mt-3 space-y-2 text-sm">
          <li v-for="event in calendarEvents" :key="event.id" class="rounded border border-zinc-800 p-3">
            <div class="font-medium">{{ event.summary }}</div>
            <div class="text-xs text-zinc-500">{{ event.start }} → {{ event.end }}</div>
          </li>
        </ul>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div class="font-medium">Active MCP stdio sessions</div>
          <UButton size="sm" variant="outline" :loading="mcpSessions.busy.value" @click="refreshMcpSessions">Refresh</UButton>
        </div>
      </template>
      <p class="text-sm text-zinc-400">
        Long-lived stdio sessions reuse the same child process for <code>tools/list</code> and <code>tools/call</code>. Idle timeout 5 min, max lifetime 30 min.
      </p>
      <UAlert
        v-if="!mcpSessions.tauriAvailable.value"
        class="mt-3"
        title="Desktop runtime required"
        description="MCP stdio sessions and tool discovery are available in the Tauri desktop app, not in the browser preview."
        color="warning"
        variant="subtle"
      />
      <UAlert v-if="mcpSessions.error.value" class="mt-3" title="MCP session error" :description="mcpSessions.error.value" color="error" variant="subtle" />
      <div v-if="mcpSessions.sessions.value.length" class="mt-4 space-y-2">
        <div
          v-for="session in mcpSessions.sessions.value"
          :key="session.sessionId"
          class="flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-800 p-3 text-sm"
        >
          <div>
            <div class="font-medium">{{ session.serverId ?? 'unknown server' }}</div>
            <div class="text-xs text-zinc-500">
              Session {{ session.sessionId.slice(0, 8) }}…
              · last used {{ mcpSessions.formatSessionAge(session.lastUsedMs) }}
              <span v-if="session.cached"> · cached</span>
            </div>
          </div>
          <UButton
            v-if="session.serverId"
            size="sm"
            variant="ghost"
            color="neutral"
            :loading="mcpSessions.busy.value"
            @click="closeMcpSession(session.serverId)"
          >
            Close
          </UButton>
        </div>
      </div>
      <p v-else class="mt-4 text-sm text-zinc-500">No active MCP sessions. Discover tools on an installed server to start one.</p>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">MCP catalog (local install)</div></template>
      <p class="text-sm text-zinc-400">
        The agent can propose <code>mcp.install</code>, but catalog installs stay allowlisted and custom servers require an explicit confirm. Env key names are stored — never secret values.
      </p>
      <div class="mt-4 space-y-3">
        <div v-for="server in mcp.catalog.value" :key="server.serverId" class="rounded border border-zinc-800 p-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="font-medium">{{ server.serverId }}</div>
              <p class="text-xs text-zinc-500">{{ server.description }}</p>
              <p class="text-xs text-zinc-500">{{ server.executable }} {{ server.args.join(' ') }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="server.installed ? (server.enabled ? 'success' : 'neutral') : 'warning'" variant="subtle">
                {{ server.installed ? (server.enabled ? 'installed' : 'disabled') : 'catalog' }}
              </UBadge>
              <UButton v-if="!server.installed" size="sm" :loading="mcp.busy.value" @click="mcp.install(server.serverId)">Install</UButton>
              <UButton v-else size="sm" variant="outline" @click="mcp.setEnabled(server.serverId, !server.enabled)">
                {{ server.enabled ? 'Disable' : 'Enable' }}
              </UButton>
              <UButton
                v-if="server.installed && server.enabled"
                size="sm"
                variant="outline"
                :loading="mcpSessions.busy.value && discoveringServerId === server.serverId"
                @click="discoverMcpTools(server)"
              >
                Discover tools
              </UButton>
              <UButton v-if="server.installed" size="sm" color="neutral" variant="ghost" @click="mcp.uninstall(server.serverId)">Uninstall</UButton>
            </div>
          </div>
          <div v-if="mcpSessions.discovered.value[server.serverId]" class="mt-3 border-t border-zinc-800 pt-3">
            <p v-if="mcpSessions.discovered.value[server.serverId]?.error" class="text-sm text-amber-400">
              {{ mcpSessions.discovered.value[server.serverId]?.error }}
            </p>
            <template v-else>
              <p class="text-xs text-zinc-500">
                {{ mcpSessions.discovered.value[server.serverId]?.tools.length ?? 0 }} tools
                · session {{ mcpSessions.discovered.value[server.serverId]?.sessionId.slice(0, 8) }}…
                · {{ mcpSessions.discovered.value[server.serverId]?.reusedSession ? 'reused' : 'new' }}
              </p>
              <ul v-if="mcpSessions.discovered.value[server.serverId]?.tools.length" class="mt-2 space-y-1 text-sm text-zinc-300">
                <li v-for="tool in mcpSessions.discovered.value[server.serverId]?.tools" :key="tool.name">
                  <span class="font-medium">{{ tool.name }}</span>
                  <span v-if="tool.description" class="text-zinc-500"> — {{ tool.description }}</span>
                </li>
              </ul>
              <p v-else class="mt-2 text-sm text-zinc-500">No tools reported by this server.</p>
            </template>
          </div>
        </div>
      </div>

      <div class="mt-6 space-y-3 border-t border-zinc-800 pt-4">
        <div class="font-medium">Custom MCP (explicit confirm)</div>
        <div class="grid gap-3 md:grid-cols-2">
          <UInput v-model="customServerId" placeholder="server-id" />
          <USelect v-model="customExecutable" :items="customExecutables" value-key="value" label-key="label" />
          <UInput v-model="customArgs" placeholder="args, comma-separated (e.g. -y, package)" class="md:col-span-2" />
          <UInput v-model="customEnvKeys" placeholder="ENV_KEY_NAMES only" class="md:col-span-2" />
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="customConfirmed" type="checkbox" />
          I confirm this custom stdio server should be installed locally
        </label>
        <UButton :disabled="!customConfirmed" :loading="mcp.busy.value" @click="installCustom">Install custom server</UButton>
      </div>
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
          <p class="text-xs text-zinc-500">
            Implementation: {{ connector.status }}
            · Cursor parity: {{ connector.cursorParity ? 'yes' : 'no' }}
            <span v-if="statusFor(connector.id)?.lastSyncAt"> · Last sync {{ statusFor(connector.id)?.lastSyncAt }}</span>
          </p>
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
import { defaultGoogleRedirectUri, GOOGLE_COMBINED_SCOPES, type GoogleConnectorId } from '~~/plugins/connectors/oauth/google-oauth'
import { loadGoogleCredentials } from '~~/plugins/connectors/oauth/google-token-store'
import { listGmailMessages, type GmailMessageSummary } from '~~/plugins/connectors/adapters/gmail-adapter'
import { searchDriveFiles, type DriveFile } from '~~/plugins/connectors/adapters/google-drive-adapter'
import { listCalendarEvents, type CalendarEvent } from '~~/plugins/connectors/adapters/google-calendar-adapter'
import { syncDrivePdfsToRag } from '~~/plugins/connectors/drive-rag-sync'
import { ingestChatGptExportFile } from '~~/plugins/connectors/chatgpt-export-ingest'
import { indexYouTubeUrlsToRag } from '~~/plugins/connectors/youtube-rag-sync'
import type { ConnectorConnectionStatus, ConnectorId } from '~~/plugins/connectors/types'
import { isAndroidBrowser } from '~~/app/utils/runtime-platform'

const isAndroidBrowserRef = computed(() => isAndroidBrowser())

const { catalog, statuses, busy, error, refresh, toggle, saveCredential, isEnabled } = useConnectors()
const google = useGoogleOAuth()
const mcp = useMcpInstall()
const mcpSessions = useMcpSessions()
const mcpApproval = useNativeMcpApproval()
const discoveringServerId = ref('')
const googleJsonInput = ref<HTMLInputElement>()
const chatgptExportInput = ref<HTMLInputElement>()
const chatgptIngestBusy = ref(false)
const chatgptIngestSummary = ref('')
const chatgptIngestConversations = ref<Array<{ id: string; title: string; chunks: number; messages: number }>>([])
const chatgptIngestErrors = ref<Array<{ id: string; message: string }>>([])
const lastChatGptExportFile = ref<File | null>(null)
const credentialDrafts = reactive<Record<string, string>>({})
const googleClientId = ref('')
const googleClientSecret = ref('')
const driveFolderId = ref('')
const redirectUri = defaultGoogleRedirectUri()
const listedScopes = GOOGLE_COMBINED_SCOPES.filter((scope) => scope.startsWith('https://'))
const scheduler = useYouTubeScheduler()
const scheduleLabel = ref('')
const scheduleType = ref<'playlist' | 'channel' | 'subscriptions'>('playlist')
const scheduleUrl = ref('')
const scheduleMaxVideos = ref('5')
const youtubeInput = ref('')
const youtubeLanguage = ref('en')
const youtubeSyncBusy = ref(false)
const youtubeSyncSummary = ref('')
const youtubeSyncVideos = ref<Array<{ videoId: string; title: string; chunks: number; url: string }>>([])
const youtubeSyncErrors = ref<Array<{ videoId: string; message: string }>>([])
const driveQuery = ref('')
const driveBusy = ref(false)
const driveSyncBusy = ref(false)
const driveSyncSummary = ref('')
const driveFiles = ref<DriveFile[]>([])
const gmailQuery = ref('')
const gmailBusy = ref(false)
const gmailMessages = ref<GmailMessageSummary[]>([])
const calendarBusy = ref(false)
const calendarEvents = ref<CalendarEvent[]>([])
const customServerId = ref('')
const customExecutable = ref('npx')
const customArgs = ref('-y, @modelcontextprotocol/server-memory')
const customEnvKeys = ref('')
const customConfirmed = ref(false)
const customExecutables = [
  { label: 'npx', value: 'npx' },
  { label: 'node', value: 'node' },
]

onMounted(async () => {
  googleClientId.value = await google.loadClientId()
  const creds = await loadGoogleCredentials()
  googleClientSecret.value = creds.clientSecret ?? ''
  driveFolderId.value = creds.driveFolderId ?? ''
  await google.refreshStatus()
  mcp.refresh()
  await mcpSessions.refresh()
  scheduler.refresh()
  await scheduler.tickIfDue()
  await refresh()
})

async function refreshAll() {
  await google.refreshStatus()
  mcp.refresh()
  await mcpSessions.refresh()
  await refresh()
}

async function refreshMcpSessions() {
  await mcpSessions.refresh()
}

async function closeMcpSession(serverId: string) {
  await mcpSessions.closeSession(serverId)
}

async function discoverMcpTools(server: { serverId: string; executable: string; args: string[] }) {
  discoveringServerId.value = server.serverId
  mcpApproval.clear()
  try {
    let approvalToken = mcpApproval.token.value ?? ''
    if (!approvalToken) {
      await mcpApproval.request(server.executable, server.args)
      approvalToken = mcpApproval.token.value ?? ''
    }
    await mcpSessions.discoverTools(server.serverId, approvalToken)
  } catch (cause) {
    mcpSessions.error.value = cause instanceof Error ? cause.message : 'MCP tool discovery failed'
  } finally {
    discoveringServerId.value = ''
  }
}

function statusFor(id: ConnectorId) {
  return statuses.value.find((item) => item.id === id)
}

function isGoogleConnector(id: ConnectorId) {
  return id === 'gmail' || id === 'google-drive' || id === 'google-calendar'
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

async function connectGoogle(connectorIds: GoogleConnectorId[]) {
  await saveGoogleConfig()
  await google.startOAuth(connectorIds)
}

async function connectYouTube() {
  await saveGoogleConfig()
  await google.connectYouTube()
}

async function runSchedulerNow() {
  await scheduler.runNow(true)
}

function addScheduleSource() {
  scheduler.addSource({
    type: scheduleType.value,
    url: scheduleUrl.value,
    label: scheduleLabel.value || scheduleType.value,
    enabled: true,
    maxVideos: Number(scheduleMaxVideos.value) || 5,
  })
  scheduleLabel.value = ''
  scheduleUrl.value = ''
}

async function onChatGptExportSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  lastChatGptExportFile.value = file
  await runChatGptIngest(false, file)
  if (chatgptExportInput.value) chatgptExportInput.value.value = ''
}

async function reindexChatGptExport() {
  if (!lastChatGptExportFile.value) {
    chatgptIngestSummary.value = 'Upload a ChatGPT export file first.'
    return
  }
  await runChatGptIngest(true, lastChatGptExportFile.value)
}

async function runChatGptIngest(force: boolean, file: File) {
  chatgptIngestBusy.value = true
  chatgptIngestSummary.value = ''
  chatgptIngestConversations.value = []
  chatgptIngestErrors.value = []
  try {
    const result = await ingestChatGptExportFile({ file, force })
    chatgptIngestConversations.value = result.conversations
    chatgptIngestErrors.value = result.errors
    chatgptIngestSummary.value = `Indexed ${result.indexed}, skipped ${result.skipped}, failed ${result.failed}.`
  } catch (cause) {
    chatgptIngestSummary.value = cause instanceof Error ? cause.message : 'ChatGPT ingest failed'
  } finally {
    chatgptIngestBusy.value = false
  }
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

async function runDriveSearch() {
  driveBusy.value = true
  try {
    driveFiles.value = await searchDriveFiles(driveQuery.value || 'pdf', 12)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Drive search failed'
  } finally {
    driveBusy.value = false
  }
}

async function runDriveSync() {
  driveSyncBusy.value = true
  driveSyncSummary.value = ''
  try {
    const result = await syncDrivePdfsToRag({ folderId: driveFolderId.value || undefined })
    driveSyncSummary.value = `Indexed ${result.indexed} PDFs, skipped ${result.skipped}.`
    await refresh()
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

async function loadCalendar() {
  calendarBusy.value = true
  try {
    calendarEvents.value = await listCalendarEvents({
      timeMin: new Date().toISOString(),
      limit: 8,
    })
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Calendar load failed'
  } finally {
    calendarBusy.value = false
  }
}

async function installCustom() {
  await mcp.installCustom({
    serverId: customServerId.value.trim(),
    executable: customExecutable.value,
    args: customArgs.value.split(',').map((item) => item.trim()).filter(Boolean),
    envKeys: customEnvKeys.value.split(',').map((item) => item.trim()).filter(Boolean),
    userConfirmed: customConfirmed.value,
  })
  customConfirmed.value = false
}

async function saveKey(key: string) {
  const value = credentialDrafts[key]
  if (!value?.trim()) return
  await saveCredential(key, value.trim())
  credentialDrafts[key] = ''
}
</script>
