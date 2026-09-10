<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">Garmin OAuth</h1>
    <p v-if="busy" class="text-sm text-zinc-400">Completing Garmin authorization…</p>
    <UAlert v-if="error" title="OAuth failed" :description="error" color="error" variant="subtle" />
    <UAlert v-else-if="done" title="Connected" description="Garmin tokens were saved to the secret vault. You can sync Wellness data from Health Sync." color="success" variant="subtle" />
    <NuxtLink to="/health-sync"><UButton variant="outline">Back to health sync</UButton></NuxtLink>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { handleCallback, busy, error } = useGarminOAuth()
const done = ref(false)

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  const oauthError = typeof route.query.error === 'string' ? route.query.error : ''
  if (oauthError) {
    error.value = oauthError
    return
  }
  if (!code) {
    error.value = 'Missing OAuth authorization code.'
    return
  }
  try {
    await handleCallback(code)
    done.value = true
  } catch {
    // error ref is set in the composable
  }
})
</script>
