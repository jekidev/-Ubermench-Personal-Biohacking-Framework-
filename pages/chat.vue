<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">LLM Chat</h1>
        <p class="text-zinc-500">Multi-turn memory, RAG context, rules/skills/workflows, and slash commands.</p>
      </div>
      <div class="flex gap-2">
        <UButton variant="outline" @click="chat.startNewConversation()">New chat</UButton>
        <UButton variant="outline" @click="chat.clearMessages()">Clear</UButton>
        <NuxtLink to="/connectors"><UButton variant="outline">Connectors</UButton></NuxtLink>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="font-medium">Conversation</div>
            <span class="text-xs text-zinc-500">{{ chat.messages.length }} messages</span>
          </div>
        </template>
        <div class="max-h-[52vh] space-y-3 overflow-y-auto">
          <div
            v-for="message in chat.messages"
            :key="message.id"
            class="rounded-md border border-zinc-800 p-3 text-sm"
            :class="message.role === 'user' ? 'bg-zinc-900' : message.role === 'system' ? 'bg-zinc-950/70' : 'bg-zinc-950'"
          >
            <div class="mb-1 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
              <span>{{ message.role }}</span>
              <span v-if="message.modelLabel" class="normal-case text-zinc-400">{{ message.modelLabel }}</span>
            </div>
            <div class="whitespace-pre-wrap">{{ message.content }}</div>
          </div>
          <p v-if="!chat.messages.length" class="text-sm text-zinc-500">Start with a question or try /help.</p>
        </div>

        <form class="mt-4 space-y-3" @submit.prevent="submit">
          <textarea
            v-model="draft"
            class="min-h-28 w-full rounded-md border border-zinc-800 bg-transparent p-3 text-sm"
            placeholder="Ask about stacks, synergies, evidence... or /research NAD+ sleep"
            @keydown="onKeydown"
          />
          <div class="flex flex-wrap items-center gap-3">
            <UButton type="submit" :loading="runtime.status.value === 'running'" :disabled="!draft.trim()">Send</UButton>
            <span class="text-xs text-zinc-500">{{ commandHint }}</span>
          </div>
          <div v-if="runtime.error.value" class="rounded-md border border-red-900/50 p-3 text-sm text-red-300">{{ runtime.error.value }}</div>
        </form>
      </UCard>

      <div class="space-y-4">
        <UCard>
          <template #header><div class="font-medium">Memory & RAG</div></template>
          <label class="mb-2 flex items-center gap-2 text-sm">
            <input type="checkbox" :checked="chat.preferences.value.includeRagContext" @change="chat.toggleRagContext(($event.target as HTMLInputElement).checked)" />
            Include indexed documents (RAG)
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" :checked="chat.preferences.value.showStackSynergy" @change="chat.toggleStackSynergy(($event.target as HTMLInputElement).checked)" />
            Include stack synergy context
          </label>
          <pre class="mt-3 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-zinc-400">{{ chat.stackSummary() }}</pre>
        </UCard>

        <UCard>
          <template #header><div class="font-medium">Custom rules</div></template>
          <div class="space-y-2">
            <UInput v-model="newRuleName" placeholder="Rule name" />
            <UInput v-model="newRuleDescription" placeholder="Short description" />
            <UTextarea v-model="newRulePrompt" :rows="3" placeholder="Instruction injected into the system prompt" />
            <UButton size="sm" :disabled="!newRuleName.trim() || !newRulePrompt.trim()" @click="addCustomRule">Add rule</UButton>
          </div>
          <ul v-if="chat.customRules().length" class="mt-3 space-y-2 text-sm">
            <li v-for="rule in chat.customRules()" :key="rule.id" class="rounded border border-zinc-800 p-2">
              <div class="flex items-center justify-between gap-2">
                <label class="flex items-center gap-2">
                  <input type="checkbox" :checked="chat.isRuleEnabled(rule.id)" @change="chat.toggleRule(rule.id, ($event.target as HTMLInputElement).checked)" />
                  <span>{{ rule.name }}</span>
                </label>
                <UButton size="xs" variant="ghost" @click="chat.removeRule(rule.id)">Remove</UButton>
              </div>
            </li>
          </ul>
        </UCard>

        <UCard>
          <template #header><div class="font-medium">Workflows</div></template>
          <div class="space-y-2">
            <label v-for="workflow in chat.workflows" :key="workflow.id" class="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                :checked="chat.isWorkflowEnabled(workflow.id)"
                @change="chat.toggleWorkflow(workflow.id, ($event.target as HTMLInputElement).checked)"
              />
              <span><code>{{ workflow.slash }}</code> — {{ workflow.name }}</span>
            </label>
          </div>
        </UCard>

        <UCard>
          <template #header><div class="font-medium">Skills</div></template>
          <div class="max-h-40 space-y-2 overflow-y-auto">
            <label v-for="skill in chat.allSkills()" :key="skill.id" class="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                :checked="chat.isSkillEnabled(skill.id)"
                @change="chat.toggleSkill(skill.id, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ skill.name }}</span>
            </label>
          </div>
        </UCard>

        <UCard>
          <template #header><div class="font-medium">Built-in rules</div></template>
          <div class="space-y-2">
            <label v-for="rule in builtInRules" :key="rule.id" class="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                :checked="chat.isRuleEnabled(rule.id)"
                @change="chat.toggleRule(rule.id, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ rule.name }}</span>
            </label>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { indexYouTubeUrlsToRag } from '../plugins/connectors/youtube-rag-sync'
import { syncDrivePdfsToRag } from '../plugins/connectors/drive-rag-sync'
import { runYouTubeScheduler } from '../plugins/connectors/youtube-scheduler'

const chat = useChatSession()
const runtime = useAgentRuntime()
const llm = useLLM()
const scheduler = useYouTubeScheduler()
const draft = ref('')
const newRuleName = ref('')
const newRuleDescription = ref('')
const newRulePrompt = ref('')
const commandHint = computed(() => chat.slashHelp().slice(0, 4).join(' · '))
const builtInRules = computed(() => chat.allRules().filter((rule) => !rule.custom))

async function runAutomationWorkflow(workflowId: string | undefined, prompt: string) {
  if (workflowId === 'youtube-rag' && /https?:\/\//.test(prompt)) {
    const result = await indexYouTubeUrlsToRag({ text: prompt })
    return `YouTube RAG indexed ${result.indexed} video(s), skipped ${result.skipped}, failed ${result.failed}.`
  }
  if (workflowId === 'youtube-schedule') {
    const result = await runYouTubeScheduler({ force: true })
    return result.store.lastRunSummary ?? `Scheduler indexed ${result.indexed} video(s).`
  }
  if (workflowId === 'drive-rag') {
    const result = await syncDrivePdfsToRag()
    return `Drive RAG indexed ${result.indexed} PDF(s), skipped ${result.skipped}.`
  }
  return null
}

function addCustomRule() {
  chat.addRule({
    name: newRuleName.value,
    description: newRuleDescription.value,
    prompt: newRulePrompt.value,
  })
  newRuleName.value = ''
  newRuleDescription.value = ''
  newRulePrompt.value = ''
}

async function submit() {
  const input = draft.value.trim()
  if (!input) return
  const task = chat.buildAgentTask(input)
  chat.pushMessage({ role: 'user', content: input, workflowId: task.parsed.workflowId })
  if (task.parsed.message && task.parsed.workflowId === 'help') {
    chat.pushMessage({ role: 'assistant', content: task.parsed.message })
    draft.value = ''
    return
  }
  draft.value = ''
  const automationNote = await runAutomationWorkflow(task.parsed.workflowId, task.prompt)
  if (automationNote) chat.pushMessage({ role: 'system', content: automationNote, workflowId: task.parsed.workflowId })
  const run = await runtime.run({
    id: task.id,
    kind: task.kind,
    prompt: task.prompt,
    requiredCapabilities: task.kind === 'research' ? ['research'] : ['reasoning'],
    chatOptions: task.chatOptions,
  })
  const latest = run.observations.at(-1)?.text ?? 'No response.'
  const modelLabel = llm.settings.value.showModel && run.activeProvider && run.activeModel
    ? `${run.activeProvider}/${run.activeModel}${run.fallbackUsed ? ' (fallback)' : ''}`
    : undefined
  chat.pushMessage({ role: 'assistant', content: latest, workflowId: task.parsed.workflowId, modelLabel })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void submit()
  }
}

onMounted(async () => {
  chat.refresh()
  scheduler.refresh()
  await scheduler.tickIfDue()
})
</script>
