<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Settings</h1>
      <p class="text-zinc-500">LLM providers are stored locally in this browser/profile.</p>
    </div>

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
          <UInput v-model="provider.apiKey" type="password" :placeholder="'API key'" autocomplete="off" @change="save" />
          <UInput v-model="provider.model" placeholder="Model (optional)" @change="save" />
          <UInput v-model="provider.baseUrl" placeholder="Base URL (optional)" @change="save" />
          <label class="flex items-center gap-2 text-sm"><input v-model="provider.enabled" type="checkbox" @change="save" /> Enabled</label>
        </div>
      </UCard>
    </div>

    <div class="flex gap-3">
      <UButton @click="clearKeys">Clear keys</UButton>
      <UButton color="neutral" variant="outline" @click="reset">Reset settings</UButton>
    </div>
    <p class="text-xs text-zinc-500">For high-security deployments, move provider secrets to the Tauri OS keychain/server proxy before sharing builds.</p>
  </div>
</template>

<script setup lang="ts">
const { settings, update, clearKeys: clearProviderKeys, reset: resetSettings } = useLLM()
function save() { update({ providers: settings.value.providers, preferFree: settings.value.preferFree, autoRotate: settings.value.autoRotate, showModel: settings.value.showModel }) }
function clearKeys() { clearProviderKeys() }
function reset() { resetSettings() }
</script>
