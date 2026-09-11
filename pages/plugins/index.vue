<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Plugins</h1>
      <p class="mt-2 text-zinc-500">Plugin modules for specialized biohacking workflows.</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="font-medium">FearPrime</div>
            <NuxtLink to="/fearprime"><UButton size="sm">Open</UButton></NuxtLink>
          </div>
        </template>
        <p class="text-sm text-zinc-400">
          PTSD & fear-learning workspace. Memory updating, extinction tracking, follow-ups and phenotype signals.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <NuxtLink to="/fearprime/memory"><UButton size="xs" variant="outline">Memory targets</UButton></NuxtLink>
          <NuxtLink to="/fearprime/state"><UButton size="xs" variant="outline">Daily state</UButton></NuxtLink>
          <NuxtLink to="/fearprime/followups"><UButton size="xs" variant="outline">Follow-ups</UButton></NuxtLink>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="font-medium">Longevity</div>
            <NuxtLink to="/longevity"><UButton size="sm">Open</UButton></NuxtLink>
          </div>
        </template>
        <p class="text-sm text-zinc-400">
          Comprehensive health tracking: biomarkers, genetics, cardiovascular, metabolic, fitness, and interventions.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <NuxtLink to="/longevity/bloods"><UButton size="xs" variant="outline">Bloods</UButton></NuxtLink>
          <NuxtLink to="/longevity/genetics"><UButton size="xs" variant="outline">Genetics</UButton></NuxtLink>
          <NuxtLink to="/longevity/fitness"><UButton size="xs" variant="outline">Fitness</UButton></NuxtLink>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="font-medium">Connectors</div>
            <NuxtLink to="/connectors"><UButton size="sm">Open</UButton></NuxtLink>
          </div>
        </template>
        <p class="text-sm text-zinc-400">
          RAG ingest pipelines for YouTube, ChatGPT exports, Google Drive, research papers, and external data sources.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <NuxtLink to="/connectors"><UButton size="xs" variant="outline">Pipeline hub</UButton></NuxtLink>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="font-medium">AI Models</div>
            <NuxtLink to="/ai-models"><UButton size="sm">Open</UButton></NuxtLink>
          </div>
        </template>
        <p class="text-sm text-zinc-400">
          LLM provider configuration, biohacking model registry, free-first routing, and orchestration settings.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <NuxtLink to="/ai-models"><UButton size="xs" variant="outline">Model registry</UButton></NuxtLink>
          <NuxtLink to="/settings"><UButton size="xs" variant="outline">LLM settings</UButton></NuxtLink>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
// Plugins hub page
</script>
