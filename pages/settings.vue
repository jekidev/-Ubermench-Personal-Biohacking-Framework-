<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Settings</h1>
      <p class="text-zinc-500">Provider configuration is persistent metadata; API keys use the Tauri Stronghold vault on desktop and a browser secret store in preview. Google OAuth and MCP installs live on <NuxtLink to="/connectors" class="underline underline-offset-4">Connectors</NuxtLink>.</p>
    </div>

    <UCard>
      <template #header><div class="flex items-center justify-between"><span class="font-medium">Secret vault</span><span class="text-xs text-zinc-500">{{ vaultUnlocked ? 'Unlocked' : 'Locked' }}</span></div></template>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <UInput v-model="vaultPassword" type="password" placeholder="Vault password" autocomplete="new-password" class="sm:flex-1" />
        <UButton v-if="!vaultUnlocked" :loading="vaultBusy" @click="unlockVault">Unlock vault</UButton>
        <UButton v-else color="neutral" variant="outline" :loading="vaultBusy" @click="lockVault">Lock vault</UButton>
      </div>
      <p v-if="vaultError" class="mt-2 text-sm text-red-500">{{ vaultError }}</p>
      <p class="mt-2 text-xs text-zinc-500">On Tauri desktop, provider API keys are stored in Stronghold and are not written to localStorage. The vault password is never persisted.</p>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">LLM orchestration</div></template>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label class="flex items-center gap-2 text-sm"><input v-model="settings.preferFree" type="checkbox" @change="save" /> Prefer free models (autoFreeOnly)</label>
        <label class="flex items-center gap-2 text-sm"><input v-model="settings.autoRotate" type="checkbox" @change="save" /> Automatic fallback / rotation</label>
        <label class="flex items-center gap-2 text-sm"><input v-model="settings.showModel" type="checkbox" @change="save" /> Show active model</label>
        <label class="flex items-center gap-2 text-sm"><input v-model="settings.allowFrameworkWrite" type="checkbox" @change="save" /> Allow framework file writes (Tauri only)</label>
      </div>
      <p class="mt-2 text-xs text-zinc-500">Framework write and command tools stay disabled unless explicitly enabled. MCP stdio always requires Tauri plus human approval.</p>
    </UCard>

    <UCard v-if="openRouterProvider">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="font-medium">OpenRouter free-model catalog</span>
          <UButton size="sm" variant="outline" :loading="catalogBusy" :disabled="!vaultUnlocked" @click="refreshCatalog">Refresh catalog</UButton>
        </div>
      </template>
      <p class="text-sm text-zinc-400">
        When <code>preferFree</code> is on, rotation expands to live free models from OpenRouter (cached 15 minutes).
      </p>
      <div class="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div><span class="text-zinc-500">Cached models:</span> {{ catalogStatus.modelCount }}</div>
        <div><span class="text-zinc-500">Cache state:</span> {{ catalogStatus.stale ? 'stale / empty' : 'fresh' }}</div>
        <div><span class="text-zinc-500">Last refresh:</span> {{ catalogFetchedLabel }}</div>
      </div>
      <p v-if="catalogStatus.error" class="mt-3 text-sm text-red-500">{{ catalogStatus.error }}</p>
      <ul v-if="catalogStatus.models.length" class="mt-4 space-y-1 font-mono text-xs text-zinc-400">
        <li v-for="model in catalogStatus.models" :key="model">{{ model }}</li>
      </ul>
      <p v-else-if="vaultUnlocked && !catalogBusy" class="mt-3 text-sm text-zinc-500">No cached free models yet. Refresh after adding an OpenRouter key.</p>
      <p v-if="!vaultUnlocked" class="mt-3 text-xs text-zinc-500">Unlock the vault to refresh the catalog.</p>
    </UCard>

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard v-for="provider in settings.providers" :key="provider.provider">
        <template #header><div class="flex items-center justify-between"><span class="font-medium capitalize">{{ provider.provider }}</span><span class="text-xs text-zinc-500">priority {{ provider.priority }}</span></div></template>
        <div class="space-y-3">
          <UInput
            v-model="provider.apiKey"
            type="password"
            placeholder="API key"
            autocomplete="off"
            :disabled="!vaultUnlocked"
            @change="saveKey(provider.provider, provider.apiKey ?? '')"
          />
          <p v-if="!vaultUnlocked" class="text-xs text-zinc-500">Unlock the secret vault before changing provider credentials.</p>
          <UInput v-model="provider.model" placeholder="Model (OpenRouter can use openrouter/free)" @change="save" />
          <UInput v-model="provider.baseUrl" placeholder="Base URL (optional)" @change="save" />
          <label class="flex items-center gap-2 text-sm"><input v-model="provider.enabled" type="checkbox" @change="save" /> Enabled</label>
        </div>
      </UCard>
    </div>

    <div class="flex flex-wrap gap-3">
      <UButton :disabled="!vaultUnlocked" @click="clearKeys">Clear keys</UButton>
      <UButton color="neutral" variant="outline" @click="reset">Reset settings</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  getOpenRouterCatalogStatus,
  refreshOpenRouterCatalog,
  type OpenRouterCatalogStatus,
} from '~/services/llm-provider-bridge'

const { settings, vaultUnlocked, unlockVault: unlock, lockVault: lock, update, setProviderKey, clearKeys: clearProviderKeys, reset: resetSettings } = useLLM()
const vaultPassword = ref('')
const vaultBusy = ref(false)
const vaultError = ref('')
const catalogBusy = ref(false)
const catalogStatus = ref<OpenRouterCatalogStatus>(getOpenRouterCatalogStatus(settings.value))

const openRouterProvider = computed(() => settings.value.providers.find((provider) => provider.provider === 'openrouter'))
const catalogFetchedLabel = computed(() => {
  if (!catalogStatus.value.fetchedAt) return 'Never'
  return new Date(catalogStatus.value.fetchedAt).toLocaleString()
})

watch(settings, (value) => {
  catalogStatus.value = getOpenRouterCatalogStatus(value)
}, { deep: true })

function save() {
  update({
    providers: settings.value.providers,
    preferFree: settings.value.preferFree,
    autoRotate: settings.value.autoRotate,
    showModel: settings.value.showModel,
    allowFrameworkWrite: settings.value.allowFrameworkWrite,
  })
}

async function unlockVault() {
  vaultError.value = ''
  vaultBusy.value = true
  try {
    await unlock(vaultPassword.value)
    vaultPassword.value = ''
  } catch (error) {
    vaultError.value = error instanceof Error ? error.message : String(error)
  } finally {
    vaultBusy.value = false
  }
}

async function lockVault() {
  vaultBusy.value = true
  try { await lock() } finally { vaultBusy.value = false }
}

async function saveKey(provider: typeof settings.value.providers[number]['provider'], apiKey: string) {
  try {
    await setProviderKey(provider, apiKey)
    if (provider === 'openrouter') catalogStatus.value = getOpenRouterCatalogStatus(settings.value)
  } catch (error) { vaultError.value = error instanceof Error ? error.message : String(error) }
}

async function refreshCatalog() {
  catalogBusy.value = true
  catalogStatus.value = await refreshOpenRouterCatalog(settings.value)
  catalogBusy.value = false
}

async function clearKeys() {
  try { await clearProviderKeys() } catch (error) { vaultError.value = error instanceof Error ? error.message : String(error) }
}

function reset() { resetSettings() }
</script>
