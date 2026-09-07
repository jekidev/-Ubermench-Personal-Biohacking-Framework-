<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Connectors</h1>
        <p class="text-zinc-500">Cursor-style integrations for Gmail, Drive, Hugging Face, GitHub, and more. Credentials live in the secret vault.</p>
      </div>
      <UButton :loading="busy" @click="refresh">Refresh</UButton>
    </div>

    <UAlert v-if="error" title="Connector error" :description="error" color="error" variant="subtle" />

    <UCard>
      <template #header><div class="font-medium">Connector status</div></template>
      <ul class="list-disc space-y-2 pl-5 text-sm text-zinc-400">
        <li><strong class="text-zinc-200">Google OAuth</strong> — PKCE flow with automatic token refresh via the secret vault.</li>
        <li><strong class="text-zinc-200">MCP stdio</strong> — spawn allowlisted servers with Tauri approval; no SSE/HTTP transport yet.</li>
        <li><strong class="text-zinc-200">Garmin OAuth</strong> — health adapter scaffold; live Connectors flow still pending.</li>
        <li><strong class="text-zinc-200">Vector RAG from Drive</strong> — lexical document index; embeddings not wired.</li>
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
          <div v-if="connector.auth.envKeys?.length" class="space-y-2">
            <div v-for="key in connector.auth.envKeys" :key="key" class="flex gap-2">
              <UInput v-model="credentialDrafts[key]" :placeholder="key" type="password" class="flex-1" />
              <UButton size="sm" @click="saveKey(key)">Save</UButton>
            </div>
          </div>
          <p v-if="connector.auth.type === 'oauth'" class="text-xs text-amber-400">OAuth flow UI pending — store tokens manually in vault for now.</p>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ConnectorConnectionStatus, ConnectorId } from '~~/plugins/connectors/types'

const { catalog, statuses, busy, error, refresh, toggle, saveCredential, isEnabled } = useConnectors()
const credentialDrafts = reactive<Record<string, string>>({})

onMounted(() => refresh())

function statusFor(id: ConnectorId) {
  return statuses.value.find((item) => item.id === id)
}

function statusColor(status?: ConnectorConnectionStatus) {
  if (status === 'connected') return 'success'
  if (status === 'configured') return 'primary'
  if (status === 'missing-credentials') return 'warning'
  if (status === 'disabled') return 'neutral'
  return 'error'
}

async function saveKey(key: string) {
  const value = credentialDrafts[key]
  if (!value?.trim()) return
  await saveCredential(key, value.trim())
  credentialDrafts[key] = ''
}
</script>
