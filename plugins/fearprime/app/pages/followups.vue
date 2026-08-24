<script setup lang="ts">
const { listPendingFollowUps, completeFollowUp } = useFearprimeStore();
const followUps = ref<Awaited<ReturnType<typeof listPendingFollowUps>>>([]);
const selectedId = ref<string | null>(null);
const saved = ref(false);
const form = reactive({ fear: 3, threatExpectancy: 30, safetyExpectancy: 70, intrusion: 2, sleepQuality: 6, sameContextResponse: 70, newContextResponse: 55 });

async function refresh() { followUps.value = await listPendingFollowUps(); }
function isDue(timestamp: string) { return new Date(timestamp).getTime() <= Date.now(); }
async function submit() {
  if (!selectedId.value) return;
  const item = followUps.value.find((entry) => String(entry.id) === selectedId.value);
  if (!item) return;
  await completeFollowUp({ followUpId: selectedId.value, timepoint: String(item.timepoint) as "24h" | "7d" | "30d" | "custom", ...form });
  selectedId.value = null; saved.value = true; await refresh();
}
onMounted(refresh);
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
    <div><p class="text-sm text-muted">Fearprime / Follow-up</p><h1 class="text-2xl font-semibold">Opfølgninger</h1><p class="mt-1 text-sm text-muted">Delayed outcomes holdes adskilt fra den oprindelige learning-event.</p></div>
    <UAlert v-if="saved" color="success" variant="subtle" title="Follow-up gemt" description="Outcome er gemt som separat event og kan senere bruges til F4/F5/F6-analyse." />
    <UCard>
      <div v-if="followUps.length" class="divide-y divide-default">
        <div v-for="item in followUps" :key="String(item.id)" class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p class="font-medium">{{ item.timepoint === '24h' ? '24-timers retention' : '7-dages retention' }}</p><p class="text-xs text-muted">Kilde-event: {{ String(item.sourceEventId).slice(0, 8) }}</p></div>
          <div class="flex items-center gap-2"><UBadge :color="isDue(String(item.timestamp)) ? 'warning' : 'neutral'" variant="subtle">{{ isDue(String(item.timestamp)) ? 'Forfalden' : new Date(String(item.timestamp)).toLocaleString('da-DK') }}</UBadge><UButton size="sm" @click="selectedId = String(item.id)">Åbn</UButton></div>
        </div>
      </div>
      <div v-else class="py-8 text-center text-sm text-muted">Ingen pending follow-ups.</div>
    </UCard>
    <UCard v-if="selectedId">
      <template #header><div class="flex items-center justify-between"><h2 class="font-semibold">Retention outcome</h2><UBadge variant="subtle">{{ followUps.find(f => String(f.id) === selectedId)?.timepoint }}</UBadge></div></template>
      <div class="grid gap-6 sm:grid-cols-2"><UFormField label="Fear"><USlider v-model="form.fear" :min="0" :max="10" /><span class="text-sm text-muted">{{ form.fear }}/10</span></UFormField><UFormField label="Threat expectancy"><USlider v-model="form.threatExpectancy" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.threatExpectancy }}/100</span></UFormField><UFormField label="Safety expectancy"><USlider v-model="form.safetyExpectancy" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.safetyExpectancy }}/100</span></UFormField><UFormField label="Intrusioner"><USlider v-model="form.intrusion" :min="0" :max="10" /><span class="text-sm text-muted">{{ form.intrusion }}/10</span></UFormField><UFormField label="Søvnkvalitet"><USlider v-model="form.sleepQuality" :min="0" :max="10" /><span class="text-sm text-muted">{{ form.sleepQuality }}/10</span></UFormField><UFormField label="Same-context response"><USlider v-model="form.sameContextResponse" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.sameContextResponse }}/100</span></UFormField><UFormField label="New-context response"><USlider v-model="form.newContextResponse" :min="0" :max="100" /><span class="text-sm text-muted">{{ form.newContextResponse }}/100</span></UFormField></div>
      <div class="mt-6 flex justify-end gap-3 border-t border-default pt-4"><UButton color="neutral" variant="soft" @click="selectedId = null">Annuller</UButton><UButton icon="i-lucide-check" @click="submit">Gem follow-up</UButton></div>
    </UCard>
  </div>
</template>
