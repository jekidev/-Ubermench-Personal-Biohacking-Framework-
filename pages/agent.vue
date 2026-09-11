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
        <p class="text-sm text-zinc-500">Preflight is validated first. Native execution still requires this explicit approval action; the agent cannot mint the token itself. Multiple native servers in one pause are approved one command at a time.</p>
        <div class="grid gap-3 md:grid-cols-2">
          <input v-model="nativeCommand" class="rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" placeholder="node" />
          <input v-model="nativeArgs" class="rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" placeholder="server.js --stdio" />
        </div>
        <div v-if="nextNativeLabel" class="text-xs text-zinc-500">{{ nextNativeLabel }}</div>
        <div class="flex flex-wrap items-center gap-3">
          <UButton :loading="native.state.value === 'preflight'" :disabled="!nativeCommand.trim()" @click="approveNative">Approve native MCP action</UButton>
          <span v-if="native.state.value === 'approved'" class="text-xs text-zinc-500">Approved for {{ native.expiresInMs.value }} ms</span>
        </div>
        <div v-if="native.error.value" class="rounded-md border border-red-300 p-3 text-sm text-red-700">{{ native.error.value }}</div>
      </div>
    </UCard>

    <UCard v-if="runtime.activeRun.value">
      <template #header><div class="font-medium">{{ waitingApprovalHeader }}</div></template>
      <div class="space-y-4">
        <div class="text-xs text-zinc-500">{{ runtime.activeRun.value.task.kind }} · {{ runtime.activeRun.value.status }} · {{ runtime.activeRun.value.selectedModel?.provider ?? 'no model' }} · retries {{ runtime.activeRun.value.retryCount ?? 0 }}</div>
        <p v-if="approvalNotice" class="text-xs text-amber-600">{{ approvalNotice }}</p>
        <div v-if="runtime.activeRun.value.toolCalls.length" class="space-y-2">
          <div class="text-sm font-medium">Tool calls</div>
          <div
            v-for="call in runtime.activeRun.value.toolCalls"
            :key="call.id"
            class="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-700"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <code>{{ call.name }}</code>
              <span class="text-xs text-zinc-500">{{ toolCallStatus(runtime.activeRun.value, call) }}</span>
            </div>
            <pre v-if="observationForToolCall(runtime.activeRun.value, call.id)" class="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-zinc-500">{{ observationForToolCall(runtime.activeRun.value, call.id)?.text }}</pre>
          </div>
          <p v-if="pendingCatalogTools.length" class="text-xs text-zinc-500">
            Catalog: {{ pendingCatalogTools.map((call) => call.name).join(', ') }}
          </p>
          <p v-if="pendingNativeTools.length" class="text-xs text-zinc-500">
            {{ nextNativeLabel || 'Native MCP (preflight token): ' + pendingNativeTools.map((call) => call.name).join(', ') }}
          </p>
          <UButton
            v-if="pendingTools.length"
            size="sm"
            :loading="runtime.status.value === 'running'"
            @click="approvePending"
          >
            {{ approvePendingLabel }}
          </UButton>
        </div>
        <div v-for="(item, index) in runtime.activeRun.value.observations" :key="`${item.createdAt}-${index}`" class="whitespace-pre-wrap rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-700">
          <div class="mb-1 text-xs uppercase tracking-wide text-zinc-500">{{ item.kind }}</div>
          {{ item.text }}
        </div>
      </div>
    </UCard>

    <UCard v-if="laterRun">
      <template #header><div class="font-medium">Later run (not the Approve target)</div></template>
      <div class="space-y-2 text-sm">
        <div class="text-xs text-zinc-500">{{ laterRun.task.kind }} · {{ laterRun.status }} · {{ laterRun.task.prompt }}</div>
        <div class="whitespace-pre-wrap rounded-md border border-zinc-200 p-4 dark:border-zinc-700">{{ formatAgentRunReply(laterRun) }}</div>
      </div>
    </UCard>

    <UCard>
      <template #header><div class="font-medium">Try a plugin or research tool</div></template>
      <p class="text-sm text-zinc-500">Runs the registered tool directly (no model required). Approval-gated tools stay off this list.</p>
      <div class="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <select v-model="tryToolName" class="rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700">
          <option v-for="tool in tryableTools" :key="tool.name" :value="tool.name">{{ tool.name }}</option>
        </select>
        <UButton :loading="tryToolBusy" :disabled="!tryToolName" @click="runTryTool">Run tool</UButton>
      </div>
      <textarea v-model="tryToolArgs" class="mt-3 min-h-24 w-full rounded-md border border-zinc-200 bg-transparent p-3 font-mono text-xs dark:border-zinc-700" />
      <div v-if="tryToolError" class="mt-3 rounded-md border border-red-300 p-3 text-sm text-red-700">{{ tryToolError }}</div>
      <pre v-if="tryToolResult" class="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-zinc-200 p-3 text-xs dark:border-zinc-700">{{ tryToolResult }}</pre>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div class="font-medium">Available tools</div>
          <span class="text-xs text-zinc-500">{{ agentTools.length }} registered</span>
        </div>
      </template>
      <p class="text-sm text-zinc-500">The agent receives this catalog in its system prompt and will run matching auto tools even if the model omits toolCalls. Plugin tools include Garmin status and PDF inspect.</p>
      <ul class="mt-3 space-y-1 font-mono text-xs text-zinc-400">
        <li v-for="tool in pluginAgentTools" :key="tool.name">
          <code>{{ tool.name }}</code> — {{ tool.description }}
        </li>
      </ul>
      <details class="mt-3">
        <summary class="cursor-pointer text-sm text-zinc-400">All tools</summary>
        <ul class="mt-2 max-h-64 space-y-1 overflow-y-auto font-mono text-xs text-zinc-500">
          <li v-for="tool in agentTools" :key="tool.name">
            <code>{{ tool.name }}</code>
            <span class="text-zinc-600"> [{{ tool.risk }}{{ tool.requiresApproval ? '/approval' : '' }}]</span>
          </li>
        </ul>
      </details>
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
import type { AgentAuditEvent, AgentRun, AgentToolCall } from '~/services/agent-runtime/types'
import { exampleArgsForTool } from '~/services/agent-runtime/invoke-tool'
import { formatNextNativePreflightLabel, resolveNativeMcpPreflightRequest } from '~/services/agent-runtime/mcp-server-tools'
import { formatAgentRunReply, observationForToolCall } from '~/services/agent-runtime/run-reply'
import { isPluginAgentToolName, isResearchAgentToolName, listAgentToolCatalog } from '~/services/agent-runtime/tool-catalog'
import { isTauriRuntime } from '~/utils/runtime-platform'
const { runtime, pendingTools, pendingCatalogTools, pendingNativeTools, approvalNotice } = usePendingAgentApprovals()
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
const agentTools = listAgentToolCatalog()
const pluginAgentTools = agentTools.filter((tool) => isPluginAgentToolName(tool.name))
const tryableTools = agentTools.filter((tool) =>
  !tool.requiresApproval && (isPluginAgentToolName(tool.name) || isResearchAgentToolName(tool.name)),
)
const tryToolName = ref(tryableTools[0]?.name ?? 'plugins.status')
const tryToolArgs = ref(JSON.stringify(exampleArgsForTool(tryToolName.value), null, 2))
const tryToolResult = ref('')
const tryToolError = ref('')
const tryToolBusy = ref(false)

watch(tryToolName, (name) => {
  tryToolArgs.value = JSON.stringify(exampleArgsForTool(name), null, 2)
  tryToolResult.value = ''
  tryToolError.value = ''
})

const nativePreflightTarget = computed(() => {
  for (const call of pendingNativeTools.value) {
    const target = resolveNativeMcpPreflightRequest(call)
    if (target) return { ...target, name: call.name }
  }
  return null
})

const nextNativeLabel = computed(() => formatNextNativePreflightLabel(pendingNativeTools.value))
const laterRun = computed(() => {
  const latest = runtime.latestRun.value
  const focused = runtime.activeRun.value
  if (!latest || !focused || latest.id === focused.id) return null
  return latest
})
const waitingApprovalHeader = computed(() => (
  laterRun.value ? 'Approve this run first' : 'Latest run'
))

const approvePendingLabel = computed(() => {
  const nextNative = nativePreflightTarget.value?.name
  if (pendingCatalogTools.value.length && pendingNativeTools.value.length) {
    return native.token.value && isTauriRuntime() && nextNative
      ? `Approve catalog + ${nextNative}`
      : 'Approve catalog tools'
  }
  if (pendingNativeTools.value.length && nextNative && native.token.value && isTauriRuntime()) {
    return `Approve ${nextNative}`
  }
  return 'Approve pending tools'
})

watch(nativePreflightTarget, (target) => {
  if (!target) return
  nativeCommand.value = target.command
  nativeArgs.value = target.args.join(' ')
}, { immediate: true })

function toolCallStatus(run: AgentRun, call: AgentToolCall) {
  if (observationForToolCall(run, call.id)) return 'completed'
  if (call.requiresApproval && !call.approvalToken) return 'waiting-approval'
  return run.status
}

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
  await runtime.resume(run.task, native.token.value ?? undefined)
  await Promise.all([refreshAudit(), refreshRecoverable()])
}

function parseTryToolArgs(): Record<string, unknown> {
  const trimmed = tryToolArgs.value.trim()
  if (!trimmed) return {}
  const parsed = JSON.parse(trimmed) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Tool args must be a JSON object.')
  }
  return parsed as Record<string, unknown>
}

async function runTryTool() {
  tryToolBusy.value = true
  tryToolError.value = ''
  tryToolResult.value = ''
  try {
    const result = await runtime.invokeTool(tryToolName.value, parseTryToolArgs())
    tryToolResult.value = typeof result.value === 'string' ? result.value : JSON.stringify(result.value, null, 2)
  } catch (cause) {
    tryToolError.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    tryToolBusy.value = false
  }
}

async function approvePending() {
  const run = runtime.activeRun.value
  if (!run) return
  if (!pendingTools.value.length) return
  const needsNative = pendingNativeTools.value.length > 0
  const target = nativePreflightTarget.value
  const command = target?.command || nativeCommand.value
  const args = target?.args ?? nativeArgs.value.split(/\s+/).filter(Boolean)
  if (target) {
    nativeCommand.value = target.command
    nativeArgs.value = target.args.join(' ')
  }
  let nativeToken = native.token.value ?? ''
  if (needsNative && !nativeToken) {
    try {
      await native.request(command, args)
      nativeToken = native.token.value ?? ''
    } catch {
      nativeToken = ''
    }
  }
  try {
    if (needsNative && nativeToken) {
      await runtime.approvePending(nativeToken, {
        includeNative: true,
        nativeCommand: command,
        nativeArgs: args,
      })
      native.clear()
    } else if (needsNative && !pendingCatalogTools.value.length) {
      runtime.error.value = native.error.value
        ?? nextNativeLabel.value
        ?? `Native MCP still needs a Tauri preflight token for ${pendingNativeTools.value.map((call) => call.name).join(', ')}.`
      return
    } else {
      await runtime.approvePending(`user-approved-${Date.now()}`, { includeNative: false })
    }
    await Promise.all([refreshAudit(), refreshRecoverable()])
  } catch (cause) {
    runtime.error.value = cause instanceof Error ? cause.message : String(cause)
  }
}

async function submit() {
  await runtime.run({ id: `task_${Date.now()}`, kind: kind.value, prompt: prompt.value, requiredCapabilities: kind.value === 'research' ? ['research'] : ['reasoning'] })
  await Promise.all([refreshAudit(), refreshRecoverable()])
}

onMounted(() => Promise.all([refreshAudit(), refreshRecoverable()]))
</script>
