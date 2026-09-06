<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">Google OAuth</h1>
    <p v-if="busy" class="text-sm text-zinc-400">Completing Google authorization…</p>
    <UAlert v-if="error" title="OAuth failed" :description="error" color="error" variant="subtle" />
    <UAlert v-else-if="done" title="Connected" description="Google Drive and Gmail tokens were saved to the secret vault." color="success" variant="subtle" />
    <NuxtLink to="/connectors"><UButton variant="outline">Back to connectors</UButton></NuxtLink>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { handleCallback, busy, error } = useGoogleOAuth()
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
    // error ref is set in composable
  }
})
</script>
