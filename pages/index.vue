<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Ubermench</h1>
        <p class="text-zinc-500">Personal health and biohacking control plane.</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/settings"><UButton variant="outline">Settings</UButton></NuxtLink>
        <NuxtLink to="/longevity"><UButton>Longevity</UButton></NuxtLink>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-4">
      <UCard v-for="card in cards" :key="card.title">
        <div class="text-sm text-zinc-500">{{ card.title }}</div>
        <div class="mt-2 text-2xl font-semibold">{{ card.value }}</div>
        <div class="mt-1 text-xs text-zinc-500">{{ card.note }}</div>
      </UCard>
    </div>

    <UCard>
      <template #header><div class="font-medium">AI orchestration</div></template>
      <div class="grid gap-3 sm:grid-cols-3 text-sm">
        <div><span class="text-zinc-500">Providers:</span> {{ enabledProviders }}</div>
        <div><span class="text-zinc-500">Free-first:</span> {{ llm.settings.value.preferFree ? 'On' : 'Off' }}</div>
        <div><span class="text-zinc-500">Rotation:</span> {{ llm.settings.value.autoRotate ? 'On' : 'Off' }}</div>
      </div>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Modules</div></template>
      <div class="flex flex-wrap gap-4 text-sm">
        <NuxtLink to="/longevity" class="underline underline-offset-4">Longevity</NuxtLink>
        <span class="text-zinc-400">Fearprime</span>
        <NuxtLink to="/settings" class="underline underline-offset-4">LLM Settings</NuxtLink>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const llm = useLLM()
const enabledProviders = computed(() => llm.settings.value.providers.filter((p) => p.enabled).length)
const cards = [
  { title: 'Plugins', value: 'Fearprime + Longevity', note: 'Modular domain architecture' },
  { title: 'Data model', value: 'Local-first', note: 'Health and DNA remain local by default' },
  { title: 'AI', value: 'Multi-provider', note: 'OpenRouter, OpenAI, Anthropic and HF routing' },
  { title: 'Desktop', value: 'Tauri 2', note: 'Native shell boundary ready' },
]
</script>
