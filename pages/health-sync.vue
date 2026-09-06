<script setup lang="ts">
import { createHealthSyncOrchestrator } from '~/services/health-sync-runtime'

const garminStatus = ref('')
const healthConnectStatus = ref('')

async function connectAndSync(provider: 'garmin' | 'health-connect') {
  const orchestrator = createHealthSyncOrchestrator()
  const state = await orchestrator.syncProvider(provider)
  const message = state.state.lastError ?? `Synced ${state.samples.length} samples (${state.observations.length} observations)`
  if (provider === 'garmin') garminStatus.value = message
  else healthConnectStatus.value = message
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Health sync</p>
      <h1 class="mt-2 text-3xl font-semibold">Garmin & Health Connect</h1>
      <p class="mt-2 text-muted">Supported providers only. Connect via OAuth (Garmin) or Android Health Connect before syncing.</p>
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <UCard>
        <h2 class="font-semibold">Garmin</h2>
        <UButton class="mt-4" @click="connectAndSync('garmin')">Connect & sync</UButton>
        <p v-if="garminStatus" class="mt-3 text-sm text-muted">{{ garminStatus }}</p>
      </UCard>
      <UCard>
        <h2 class="font-semibold">Android Health Connect</h2>
        <UButton class="mt-4" @click="connectAndSync('health-connect')">Connect & sync</UButton>
        <p v-if="healthConnectStatus" class="mt-3 text-sm text-muted">{{ healthConnectStatus }}</p>
      </UCard>
    </div>
  </div>
</template>
