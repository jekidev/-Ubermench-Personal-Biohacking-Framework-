<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Settings</h1>
      <p class="text-zinc-500">Provider configuration is persistent metadata; API keys use the Tauri Stronghold vault on desktop and an in-memory fallback in browser preview.</p>
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
      <div class="grid gap-4 sm:grid-cols-3">
        <label class="flex items-center gap-2 text-sm"><input v-model="settings.preferFree" type="checkbox" @change="save" /> Prefer free models</label>
        <label class="flex items-center gap-2 text-sm"><input v-model="settings.autoRotate" type="checkbox" @change="save" /> Automatic fallback / rotation</label>
        <label class="flex items-center gap-2 text-sm"><input v-model="settings.showModel" type="checkbox" @change="save" /> Show active model</label>
      </div>
    </UCard>

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard v-for="provider in settings.providers" :key="provider.provider">
        <template #header><div class="flex items-center justify-between"><span class="font-medium capitalize">{{ provider.provider }}</span><span class="text-xs text-zinc-500">priority {{ provider.priority }}</span></div></template>
        <div class="space-y-3">
          <UInput v-model="provider.apiKey" type="password" placeholder="API key" autocomplete="off" @change="saveKey(provider.provider, provider.apiKey ?? '')" />
          <UInput v-model="provider.model" placeholder="Model (OpenRouter can use openrouter/free)" @change="save" />
          <UInput v-model="provider.baseUrl" placeholder="Base URL (optional)" @change="save" />
          <label class="flex items-center gap-2 text-sm"><input v-model="provider.enabled" type="checkbox" @change="save" /> Enabled</label>
        </div>
      </UCard>
    </div>

    <div class="flex gap-3">
      <UButton :disabled="!vaultUnlocked" @click="clearKeys">Clear keys</UButton>
      <UButton color="neutral" variant="outline" @click="reset">Reset settings</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const { settings, vaultUnlocked, unlockVault: unlock, lockVault: lock, update, setProviderKey, clearKeys: clearProviderKeys, reset: resetSettings } = useLLM()
const vaultPassword = ref('')
const vaultBusy = ref(false)
const vaultError = ref('')

function save() {
  update({ providers: settings.value.providers, preferFree: settings.value.preferFree, autoRotate: settings.value.autoRotate, showModel: settings.value.showModel })
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
  try { await setProviderKey(provider, apiKey) } catch (error) { vaultError.value = error instanceof Error ? error.message : String(error) }
}

async function clearKeys() {
  try { await clearProviderKeys() } catch (error) { vaultError.value = error instanceof Error ? error.message : String(error) }
}

function reset() { resetSettings() }
</script>
