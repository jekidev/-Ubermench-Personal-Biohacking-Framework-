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

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard v-for="card in cards" :key="card.title">
        <div class="text-sm text-zinc-500">{{ card.title }}</div>
        <div class="mt-2 text-2xl font-semibold">{{ card.value }}</div>
        <div class="mt-1 text-xs text-zinc-500">{{ card.note }}</div>
      </UCard>
    </div>

    <UCard>
      <template #header><div class="font-medium">Personal data coverage</div></template>
      <div class="grid gap-3 sm:grid-cols-3 text-sm">
        <div><span class="text-zinc-500">Biomarkers:</span> {{ profile.biomarkers.length }}</div>
        <div><span class="text-zinc-500">Genetic variants:</span> {{ profile.variants.length }}</div>
        <div><span class="text-zinc-500">Sleep / training:</span> {{ profile.sleep.length }} / {{ profile.training.length }}</div>
      </div>
      <p class="mt-3 text-xs text-zinc-500">Profile state is loaded from the local-first biology store.</p>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">AI console</div></template>
      <form class="space-y-3" @submit.prevent="runAI">
        <textarea v-model="prompt" class="min-h-28 w-full rounded-md border border-zinc-200 bg-transparent p-3 text-sm dark:border-zinc-700" placeholder="Ask Ubermench to research, analyse or reason about a health optimisation question..." />
        <div class="flex flex-wrap items-center gap-3">
          <UButton type="submit" :loading="loading" :disabled="!prompt.trim()">Run</UButton>
          <span v-if="lastRun" class="text-xs text-zinc-500">{{ lastRun.provider }} / {{ lastRun.model }} · {{ lastRun.latencyMs }} ms · {{ lastRun.attempts }} attempt{{ lastRun.attempts === 1 ? '' : 's' }}</span>
        </div>
        <div v-if="error" class="rounded-md border border-red-300 p-3 text-sm text-red-700">{{ error }}</div>
        <div v-if="lastRun" class="whitespace-pre-wrap rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-700">{{ lastRun.text }}</div>
      </form>
    </UCard>

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
import { assessLongevity } from '~/services/longevity-engine'

const llm = useLLM()
const ai = useBiohackingAI()
const biology = usePersonalBiology()
const profile = biology.profile
const prompt = ref('')
const loading = ref(false)
const error = ref('')
const lastRun = ref<Awaited<ReturnType<typeof ai.ask>> | null>(null)

await biology.initialize()

const enabledProviders = computed(() => llm.settings.value.providers.filter((p) => p.enabled).length)
const assessment = computed(() => assessLongevity(profile.value))
const cards = computed(() => [
  { title: 'Plugins', value: 'Fearprime + Longevity', note: 'Modular domain architecture' },
  { title: 'Biology', value: String(profile.value.biomarkers.length), note: 'Biomarker records loaded locally' },
  { title: 'Longevity', value: `${assessment.value.score}/100`, note: 'Reference-bound screening only' },
  { title: 'AI', value: `${enabledProviders.value} providers`, note: 'Multi-provider orchestration' },
])

async function runAI() {
  error.value = ''
  lastRun.value = null
  loading.value = true
  try {
    lastRun.value = await ai.ask({
      prompt: prompt.value,
      mode: 'biohacker',
      system: 'You are the Uberm3nch research assistant. Separate evidence from speculation. Do not invent sources. Flag uncertainty and safety concerns. Do not autonomously prescribe, start, stop or titrate medical treatment.',
    })
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    loading.value = false
  }
}
</script>
