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

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="font-medium">Data quality</div>
            <NuxtLink to="/data-health"><UButton size="sm" variant="outline">Data health</UButton></NuxtLink>
          </div>
        </template>
        <div class="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span class="text-zinc-500">Completeness:</span> {{ overview.qualityPercent }}%</div>
          <div><span class="text-zinc-500">Issues:</span> {{ overview.quality.issues.length }}</div>
          <div><span class="text-zinc-500">Source coverage:</span> {{ percent(overview.quality.sourceCoverage) }}</div>
          <div><span class="text-zinc-500">Timestamp coverage:</span> {{ percent(overview.quality.timestampCoverage) }}</div>
        </div>
        <p v-if="overview.topGap" class="mt-3 text-sm text-zinc-400">
          Top gap: {{ overview.topGap.metric }} — {{ overview.topGap.reason }}
        </p>
        <p v-else class="mt-3 text-sm text-zinc-400">No major data gaps detected.</p>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="font-medium">Experiments</div>
            <NuxtLink to="/experiments"><UButton size="sm" variant="outline">Open</UButton></NuxtLink>
          </div>
        </template>
        <div class="text-sm">
          <div><span class="text-zinc-500">Stored protocols:</span> {{ overview.experimentCount }}</div>
          <div v-if="overview.latestConclusion" class="mt-3">
            <div class="font-medium">{{ overview.latestConclusion.intervention }} → {{ overview.latestConclusion.metric || 'metric' }}</div>
            <div class="mt-1 text-zinc-400">
              {{ overview.latestConclusion.conclusionType || overview.latestConclusion.status || 'No conclusion yet' }}
            </div>
            <p v-if="overview.latestConclusion.conclusionRationale" class="mt-1 text-xs text-zinc-500">
              {{ overview.latestConclusion.conclusionRationale }}
            </p>
          </div>
          <p v-else class="mt-3 text-zinc-400">No N-of-1 protocols stored yet.</p>
        </div>
      </UCard>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="font-medium">Safety</div>
            <NuxtLink to="/safety"><UButton size="sm" variant="outline">Review</UButton></NuxtLink>
          </div>
        </template>
        <div class="text-sm">
          <UBadge :color="safetyColor" variant="subtle">{{ overview.safetySeverity }}</UBadge>
          <p class="mt-3">{{ overview.safetyTitle }}</p>
          <p class="mt-2 text-xs text-zinc-500">Safety screening is kept separate from efficacy ranking and does not approve treatment changes.</p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="font-medium">Biology backup</div>
            <NuxtLink to="/biology"><UButton size="sm" variant="outline">Backup</UButton></NuxtLink>
          </div>
        </template>
        <p class="text-sm text-zinc-400">{{ overview.backupNote }}</p>
        <p class="mt-2 text-xs text-zinc-500">Export and restore stay local. No cloud account is required.</p>
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
      <template #header><div class="font-medium">Workspace</div></template>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <NuxtLink
          v-for="card in overview.navigation"
          :key="card.to"
          :to="card.to"
          class="rounded-lg border border-zinc-800 p-3 hover:bg-zinc-900"
        >
          <div class="font-medium">{{ card.label }}</div>
          <div class="mt-1 text-xs text-zinc-500">{{ card.description }}</div>
        </NuxtLink>
      </div>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">AI console</div></template>
      <form class="space-y-3" @submit.prevent="runAI">
        <textarea v-model="prompt" class="min-h-28 w-full rounded-md border border-zinc-200 bg-transparent p-3 text-sm dark:border-zinc-700" placeholder="Ask Ubermench to research, analyse or reason about a health optimisation question..." />
        <div class="flex flex-wrap items-center gap-3">
          <UButton type="submit" :loading="loading" :disabled="!prompt.trim()">Run agent</UButton>
          <span class="text-xs text-zinc-500">Uses the agent kernel, including Garmin/PDF/research tools when they help. Waiting-approval is shared with Chat and Agent.</span>
          <span v-if="displayedRun" class="text-xs text-zinc-500">{{ displayedRun.provider }} / {{ displayedRun.model }} · {{ displayedRun.status }}</span>
        </div>
        <div v-if="error" class="rounded-md border border-red-300 p-3 text-sm text-red-700">{{ error }}</div>
        <div v-if="displayedRun && waitingApproval" class="rounded-md border border-amber-800/70 bg-amber-950/30 p-3 text-sm">
          <div class="font-medium text-amber-200">Active run waiting for approval</div>
          <p v-if="displayedRun.prompt" class="mt-1 text-xs text-zinc-500">{{ displayedRun.prompt }}</p>
        </div>
        <div v-if="displayedRun" class="whitespace-pre-wrap rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-700">{{ displayedRun.text }}</div>
        <div v-if="waitingApproval" class="flex flex-wrap gap-2">
          <UButton
            v-if="pendingCatalogTools.length"
            size="sm"
            :loading="loading"
            @click="approvePending"
          >
            {{ pendingNativeTools.length ? 'Approve catalog tools' : 'Approve pending tools' }}
          </UButton>
          <p v-if="pendingCatalogTools.length" class="w-full text-xs text-zinc-500">
            Catalog: {{ pendingCatalogTools.map((call) => call.name).join(', ') }}
          </p>
          <p v-if="pendingNativeTools.length" class="w-full text-xs text-zinc-500">
            Native MCP still needs Agent preflight: {{ pendingNativeTools.map((call) => call.name).join(', ') }}.
          </p>
          <NuxtLink to="/chat"><UButton size="sm" variant="outline">Open Chat</UButton></NuxtLink>
          <NuxtLink to="/agent"><UButton size="sm" variant="outline">Open Agent</UButton></NuxtLink>
        </div>
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
  </div>
</template>

<script setup lang="ts">
import { loadBackupStatus } from '~/services/backup-status'
import { assessLongevity } from '~/services/longevity-engine'
import { buildOverviewSummary } from '~/services/overview-dashboard'
import { screenProfileSafety } from '~/services/profile-safety'
const llm = useLLM()
const { runtime, pendingCatalogTools, pendingNativeTools, displayedRun, waitingApproval } = usePendingAgentApprovals()
const biology = usePersonalBiology()
const experiments = useExperiments()
const profile = biology.profile
const prompt = ref('')
const loading = ref(false)
const error = ref('')

await biology.initialize()
await experiments.initialize()

const enabledProviders = computed(() => llm.settings.value.providers.filter((p) => p.enabled).length)
const assessment = computed(() => assessLongevity(profile.value))
const safetyFlags = computed(() => screenProfileSafety(profile.value))
const overview = computed(() => buildOverviewSummary({
  profile: profile.value,
  experiments: experiments.experiments.value,
  summarizeExperiment: (experiment) => {
    const stored = experiments.experiments.value.find((item) => item.id === experiment.id)
    if (!stored) return {}
    const summary = experiments.summarize(stored).summary
    return { conclusionType: summary.conclusionType, conclusionRationale: summary.conclusionRationale }
  },
  safetyFlags: safetyFlags.value,
  backup: loadBackupStatus(),
}))

const safetyColor = computed(() => {
  if (overview.value.safetySeverity === 'red') return 'error'
  if (overview.value.safetySeverity === 'orange' || overview.value.safetySeverity === 'yellow') return 'warning'
  return 'success'
})

const cards = computed(() => [
  { title: 'Data quality', value: `${overview.value.qualityPercent}%`, note: overview.value.topGap ? `Gap: ${overview.value.topGap.metric}` : 'Core domains populated' },
  { title: 'Experiments', value: String(overview.value.experimentCount), note: overview.value.latestConclusion?.conclusionType ?? 'No protocols yet' },
  { title: 'Safety', value: overview.value.safetySeverity, note: overview.value.safetyTitle },
  { title: 'Longevity', value: `${assessment.value.score}/100`, note: 'Reference-bound screening only' },
])

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

async function runAI() {
  error.value = ''
  loading.value = true
  try {
    const looksLikeResearch = /pubmed|arxiv|paper|literature|europe pmc|paperqa|research/i.test(prompt.value)
    await runtime.run({
      id: `overview_${Date.now()}`,
      kind: looksLikeResearch ? 'research' : 'chat',
      prompt: prompt.value,
      requiredCapabilities: looksLikeResearch ? ['research'] : ['reasoning'],
    })
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    loading.value = false
  }
}

async function approvePending() {
  if (!runtime.activeRun.value) return
  if (!pendingCatalogTools.value.length) {
    error.value = pendingNativeTools.value.length
      ? `Native MCP still needs Agent preflight: ${pendingNativeTools.value.map((call) => call.name).join(', ')}. Open Agent.`
      : 'No catalog tools are waiting for approval.'
    return
  }
  error.value = ''
  loading.value = true
  try {
    await runtime.approvePending(`user-approved-${Date.now()}`, { includeNative: false })
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    loading.value = false
  }
}
</script>
