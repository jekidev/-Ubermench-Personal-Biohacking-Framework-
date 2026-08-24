<script setup lang="ts">
const { listMemoryTargets, listPendingFollowUps } = useFearprimeStore();

const memoryCount = ref(0);
const followUpCount = ref(0);
const modules = computed(() => [
  { title: "Daglig state", value: "—", description: "Baseline og løbende state", to: "/state" },
  { title: "Memory targets", value: String(memoryCount.value), description: "Aktive targets", to: "/memory" },
  { title: "Learning events", value: "—", description: "Prediction → outcome", to: "/learning" },
  { title: "Follow-ups", value: String(followUpCount.value), description: "Afventer måling", to: "/followups" }
]);

const nextStep = computed(() => followUpCount.value > 0 ? "Gennemfør næste retention follow-up" : "Opret første memory target");

onMounted(async () => {
  memoryCount.value = (await listMemoryTargets()).length;
  followUpCount.value = (await listPendingFollowUps()).length;
});
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <header class="border-b border-default/60 bg-elevated/80 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ubermench Framework</p>
          <h1 class="text-xl font-semibold">Fearprime</h1>
        </div>
        <UBadge color="primary" variant="subtle">Nuxt 4 · Tauri 2</UBadge>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section class="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <UCard>
          <div class="space-y-4">
            <div>
              <p class="text-sm text-muted">Nuværende fokus</p>
              <h2 class="mt-1 text-2xl font-semibold">Fear learning &amp; retention</h2>
            </div>
            <p class="max-w-2xl text-sm leading-6 text-muted">
              Fearprime modellerer acquisition, extinction, consolidation, retrieval,
              generalisation og relapse som målbare learning-events. Interventioner er
              adskilt fra hypoteser og vurderes mod prædefinerede endpoints.
            </p>
            <div class="flex flex-wrap gap-2">
              <UButton to="/memory" icon="i-lucide-brain">Memory target</UButton>
              <UButton to="/learning" color="neutral" variant="soft" icon="i-lucide-flask-conical">Learning event</UButton>
              <UButton to="/state" color="neutral" variant="soft" icon="i-lucide-activity">Daglig state</UButton>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="space-y-3">
            <p class="text-sm text-muted">Next-best-test</p>
            <p class="text-lg font-semibold">{{ nextStep }}</p>
            <p class="text-sm text-muted">Systemet foreslår først en måling; interventioner og kliniske beslutninger holdes adskilt fra denne motor.</p>
            <UBadge color="warning" variant="subtle">Clinician review hvor relevant</UBadge>
          </div>
        </UCard>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <NuxtLink v-for="item in modules" :key="item.title" :to="item.to" class="block">
          <UCard class="h-full transition hover:-translate-y-0.5 hover:shadow-md">
            <p class="text-sm text-muted">{{ item.title }}</p>
            <p class="mt-2 text-3xl font-semibold">{{ item.value }}</p>
            <p class="mt-1 text-xs text-muted">{{ item.description }}</p>
          </UCard>
        </NuxtLink>
      </section>

      <section class="grid gap-4 lg:grid-cols-2">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">State machine</h2>
              <UBadge variant="subtle">offline-first</UBadge>
            </div>
          </template>
          <div class="grid gap-2 sm:grid-cols-3">
            <NuxtLink v-for="step in [
              ['Memory', '/memory'],
              ['Learning', '/learning'],
              ['Follow-up', '/followups']
            ]" :key="step[0]" :to="step[1]" class="rounded-lg border border-default p-3 text-sm transition hover:bg-elevated">
              {{ step[0] }}
            </NuxtLink>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold">Aktive phenotype-hypoteser</h2>
          </template>
          <div class="space-y-3 text-sm">
            <div class="flex items-center justify-between"><span>F4 · Consolidation</span><UBadge color="neutral" variant="subtle">Afventer data</UBadge></div>
            <div class="flex items-center justify-between"><span>F5 · Generalisation</span><UBadge color="neutral" variant="subtle">Afventer data</UBadge></div>
            <div class="flex items-center justify-between"><span>F11 · Chronic state</span><UBadge color="neutral" variant="subtle">Afventer data</UBadge></div>
          </div>
        </UCard>
      </section>
    </main>
  </div>
</template>
