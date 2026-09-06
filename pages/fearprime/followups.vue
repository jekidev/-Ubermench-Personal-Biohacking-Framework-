<script setup lang="ts">
const { listPendingFollowUps } = useFearprimeStore()
const followUps = ref<Awaited<ReturnType<typeof listPendingFollowUps>>>([])

onMounted(async () => {
  followUps.value = await listPendingFollowUps()
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <NuxtLink to="/fearprime" class="text-sm text-muted">← Fearprime</NuxtLink>
    <h1 class="text-2xl font-semibold">Follow-ups</h1>
    <UCard>
      <div v-if="!followUps.length" class="text-sm text-muted">No pending follow-ups.</div>
      <div v-for="item in followUps" :key="item.id" class="border-b border-default py-3 text-sm">
        <p>{{ item.timepoint ?? 'follow-up' }} · {{ item.timestamp }}</p>
      </div>
    </UCard>
  </div>
</template>
