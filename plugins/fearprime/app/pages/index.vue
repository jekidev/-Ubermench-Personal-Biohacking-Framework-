<script setup lang="ts">
const modules = [
  { title: "Daglig state", value: "08", description: "Baseline og løbende state" },
  { title: "Memory targets", value: "03", description: "Aktive targets" },
  { title: "Hypoteser", value: "04", description: "Åbne competing hypotheses" },
  { title: "Follow-ups", value: "02", description: "Afventer måling" }
];

const nextStep = "Standardiseret retentionstest";
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <header class="border-b border-default/60 bg-elevated/80 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ubermench Framework</p>
          <h1 class="text-xl font-semibold">Fearprime</h1>
        </div>
        <UBadge color="primary" variant="subtle">v0.1 prototype</UBadge>
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
              <UButton to="/state" color="neutral" variant="soft" icon="i-lucide-activity">Daglig state</UButton>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="space-y-3">
            <p class="text-sm text-muted">Next-best-test</p>
            <p class="text-lg font-semibold">{{ nextStep }}</p>
            <p class="text-sm text-muted">Valgt for at skelne mellem aktive hypoteser uden at ændre prediction lock.</p>
            <UBadge color="warning" variant="subtle">Clinician review</UBadge>
          </div>
        </UCard>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UCard v-for="item in modules" :key="item.title">
          <p class="text-sm text-muted">{{ item.title }}</p>
          <p class="mt-2 text-3xl font-semibold">{{ item.value }}</p>
          <p class="mt-1 text-xs text-muted">{{ item.description }}</p>
        </UCard>
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
            <div v-for="step in ['Prediction lock', 'Learning event', 'Follow-up']" :key="step" class="rounded-lg border border-default p-3 text-sm">
              {{ step }}
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold">Aktive phenotype-hypoteser</h2>
          </template>
          <div class="space-y-3 text-sm">
            <div class="flex items-center justify-between"><span>F4 · Consolidation</span><UBadge color="primary" variant="subtle">0.78</UBadge></div>
            <div class="flex items-center justify-between"><span>F5 · Generalisation</span><UBadge color="neutral" variant="subtle">0.44</UBadge></div>
            <div class="flex items-center justify-between"><span>F8 · Reconsolidation</span><UBadge color="neutral" variant="subtle">0.31</UBadge></div>
          </div>
        </UCard>
      </section>
    </main>
  </div>
</template>
