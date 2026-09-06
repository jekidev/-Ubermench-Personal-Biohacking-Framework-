<script setup lang="ts">
import { syncHealthProvider } from '~/services/health-sync-runtime'

const garminStatus = ref('')
const healthConnectStatus = ref('')

async function syncGarmin() {
  const result = await syncHealthProvider('garmin')
  garminStatus.value = result.error ?? `Synced ${result.samples.length} samples`
}

async function syncHealthConnect() {
  const result = await syncHealthProvider('health-connect')
  healthConnectStatus.value = result.error ?? `Synced ${result.samples.length} samples`
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Health sync</p>
      <h1 class="mt-2 text-3xl font-semibold">Garmin & Health Connect</h1>
      <p class="mt-2 text-muted">Supported providers only. Native adapters must be connected before sync succeeds.</p>
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <UCard>
        <h2 class="font-semibold">Garmin</h2>
        <UButton class="mt-4" @click="syncGarmin">Test sync</UButton>
        <p v-if="garminStatus" class="mt-3 text-sm text-muted">{{ garminStatus }}</p>
      </UCard>
      <UCard>
        <h2 class="font-semibold">Android Health Connect</h2>
        <UButton class="mt-4" @click="syncHealthConnect">Test sync</UButton>
        <p v-if="healthConnectStatus" class="mt-3 text-sm text-muted">{{ healthConnectStatus }}</p>
      </UCard>
    </div>
  </div>
</template>
