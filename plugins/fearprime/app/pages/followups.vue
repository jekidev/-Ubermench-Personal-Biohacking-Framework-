<script setup lang="ts">
const { listPendingFollowUps } = useFearprimeStore();
const followUps = ref<Awaited<ReturnType<typeof listPendingFollowUps>>>([]);

onMounted(async () => {
  followUps.value = await listPendingFollowUps();
});

function isDue(timestamp: string) {
  return new Date(timestamp).getTime() <= Date.now();
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
    <div>
      <p class="text-sm text-muted">Fearprime / Follow-up</p>
      <h1 class="text-2xl font-semibold">Opfølgninger</h1>
      <p class="mt-1 text-sm text-muted">Delayed outcomes holdes adskilt fra den oprindelige learning-event.</p>
    </div>

    <UCard>
      <div v-if="followUps.length" class="divide-y divide-default">
        <div v-for="item in followUps" :key="String(item.id)" class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-medium">{{ item.timepoint === '24h' ? '24-timers retention' : '7-dages retention' }}</p>
            <p class="text-xs text-muted">Kilde-event: {{ String(item.sourceEventId).slice(0, 8) }}</p>
          </div>
          <UBadge :color="isDue(String(item.timestamp)) ? 'warning' : 'neutral'" variant="subtle">
            {{ isDue(String(item.timestamp)) ? 'Forfalden' : new Date(String(item.timestamp)).toLocaleString('da-DK') }}
          </UBadge>
        </div>
      </div>
      <div v-else class="py-8 text-center text-sm text-muted">
        Ingen pending follow-ups. Når et learning event gemmes, oprettes 24h og 7d automatisk.
      </div>
    </UCard>
  </div>
</template>
