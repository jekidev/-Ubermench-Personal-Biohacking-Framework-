<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Agent Control Center</h1>
        <p class="text-zinc-500">Closed-loop model, memory, skills, governance, recovery and audit runtime.</p>
      </div>
      <NuxtLink to="/"><UButton variant="outline">Dashboard</UButton></NuxtLink>
    </div>

    <div class="grid gap-4 md:grid-cols-5">
      <UCard><div class="text-xs text-zinc-500">Status</div><div class="mt-2 text-xl font-semibold">{{ runtime.status.value }}</div></UCard>
      <UCard><div class="text-xs text-zinc-500">Model</div><div class="mt-2 text-sm font-medium">{{ runtime.activeRun.value?.selectedModel?.model ?? 'none' }}</div></UCard>
      <UCard><div class="text-xs text-zinc-500">Memory</div><div class="mt-2 text-xl font-semibold">{{ runtime.activeRun.value?.context.memories.length ?? 0 }}</div></UCard>
      <UCard><div class="text-xs text-zinc-500">Skills</div><div class="mt-2 text-xl font-semibold">{{ runtime.activeRun.value?.context.skills.length ?? 0 }}</div></UCard>
      <UCard><div class="text-xs text-zinc-500">Audit</div><div class="mt-2 text-xl font-semibold">{{ auditEvents.length }}</div></UCard>
    </div>

    <UCard>
      <template #header><div class="font-medium">Provider health</div></template>
      <div v-if="health.length" class="space-y-2">
        <div v-for="item in health" :key="item.provider" class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-700">
          <div><span class="font-medium">{{ item.provider }}</span><span class="ml-2 text-xs text-zinc-500">{{ item.failures }} failures / {{ item.successes }} successes</span></div>
          <span class="rounded px-2 py-1 text-xs font-medium">{{ item.state }}</span>
        </div>
      </div>
      <div v-else class="text-sm text-zinc-500">No provider failures recorded yet.</div>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Run agent</div></template>
      <form class="space-y-3" @submit.prevent="submit">
        <textarea v-model="prompt" class="min-h-32 w-full rounded-md border border-zinc-200 bg-transparent p-3 text-sm dark:border-zinc-700" placeholder="Research, analyze, compare or plan..." />
        <div class="flex flex-wrap items-center gap-3">
          <select v-model="kind" class="rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700">
            <option value="chat">Chat</option><option value="research">Research</option><option value="biohacking">Biohacking</option><option value="coding">Coding</option><option value="automation">Automation</option>
          </select>
          <UButton type="submit" :loading="runtime.status.value === 'running'" :disabled="!prompt.trim()">Execute</UButton>
          <UButton type="button" variant="outline" :loading="auditLoading" @click="refreshAudit">Refresh audit</UButton>
          <UButton type="button" variant="outline" :loading="runsLoading" @click="refreshRecoverable">Refresh recoverable</UButton>
        </div>
        <div v-if="runtime.error.value" class="rounded-md border border-red-300 p-3 text-sm text-red-700">{{ runtime.error.value }}</div>
      </form>
    </UCard>

    <UCard v-if="recoverable.length">
      <template #header><div class="font-medium">Recoverable runs</div></template>
      <div class="space-y-2">
        <div v-for="run in recoverable" :key="run.id" class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-700">
          <div><div class="font-medium">{{ run.task.prompt }}</div><div class="text-xs text-zinc-500">{{ run.id }} · {{ run.status }} · {{ run.task.kind }}</div></div>
          <UButton size="sm" @click="resume(run)">Resume</UButton>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Native MCP approval</div></template>
      <div class="space-y-3">
        <p class="text-sm text-zinc-500">Preflight is validated first. Native execution still requires this explicit approval action; the agent cannot mint the token itself.</p>
        <div class="grid gap-3 md:grid-cols-2">
          <input v-model="nativeCommand" class="rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" placeholder="node" />
          <input v-model="nativeArgs" class="rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" placeholder="server.js --stdio" />
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <UButton :loading="native.state.value === 'preflight'" :disabled="!nativeCommand.trim()" @click="approveNative">Approve native MCP action</UButton>
          <span v-if="native.state.value === 'approved'" class="text-xs text-zinc-500">Approved for {{ native.expiresInMs.value }} ms</span>
        </div>
        <div v-if="native.error.value" class="rounded-md border border-red-300 p-3 text-sm text-red-700">{{ native.error.value }}</div>
      </div>
    </UCard>

    <UCard v-if="runtime.activeRun.value">
      <template #header><div class="font-medium">Latest run</div></template>
      <div class="space-y-4">
        <div class="text-xs text-zinc-500">{{ runtime.activeRun.value.task.kind }} · {{ runtime.activeRun.value.status }} · {{ runtime.activeRun.value.selectedModel?.provider ?? 'no model' }} · retries {{ runtime.activeRun.value.retryCount ?? 0 }}</div>
        <div v-for="(item, index) in runtime.activeRun.value.observations" :key="`${item.createdAt}-${index}`" class="whitespace-pre-wrap rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-700">{{ item.text }}</div>
      </div>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Audit trail</div></template>
      <div v-if="auditEvents.length" class="space-y-2">
        <div v-for="event in auditEvents.slice(0, 20)" :key="event.id" class="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-700">
          <div class="flex flex-wrap justify-between gap-2"><span class="font-medium">{{ event.type }}</span><span class="text-xs text-zinc-500">{{ event.createdAt }}</span></div>
          <div class="mt-1 text-zinc-600 dark:text-zinc-300">{{ event.detail }}</div>
        </div>
      </div>
      <div v-else class="text-sm text-zinc-500">No audit events recorded yet.</div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { AgentTaskKind } from '~/services/agent-superstack/types'
import type { AgentAuditEvent, AgentRun } from '~/services/agent-runtime/types'
const runtime = useAgentRuntime()
const native = useNativeMcpApproval()
const prompt = ref('')
const kind = ref<AgentTaskKind>('research')
const auditEvents = ref<AgentAuditEvent[]>([])
const recoverable = ref<AgentRun[]>([])
const health = computed(() => runtime.providerHealthSnapshot())
const auditLoading = ref(false)
const runsLoading = ref(false)
const nativeCommand = ref('node')
const nativeArgs = ref('server.js')

async function refreshAudit() {
  auditLoading.value = true
  try { auditEvents.value = await runtime.audit(100) } finally { auditLoading.value = false }
}

async function refreshRecoverable() {
  runsLoading.value = true
  try {
    const runs = await runtime.recentRuns(100)
    recoverable.value = runs.filter((run) => ['planning', 'executing', 'waiting-approval', 'recovering'].includes(run.status))
  } finally { runsLoading.value = false }
}

async function approveNative() {
  await native.request(nativeCommand.value, nativeArgs.value.split(/\s+/).filter(Boolean))
}

async function resume(run: AgentRun) {
  await runtime.resume(run.task)
  await Promise.all([refreshAudit(), refreshRecoverable()])
}

async function submit() {
  await runtime.run({ id: `task_${Date.now()}`, kind: kind.value, prompt: prompt.value, requiredCapabilities: kind.value === 'research' ? ['research'] : ['reasoning'] })
  await Promise.all([refreshAudit(), refreshRecoverable()])
}

onMounted(() => Promise.all([refreshAudit(), refreshRecoverable()]))
</script>
