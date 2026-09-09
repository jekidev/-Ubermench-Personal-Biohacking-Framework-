<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">LLM Chat</h1>
        <p class="text-zinc-500">Toggle rules, skills, and workflows. Use slash commands like /research, /stack, /youtube.</p>
      </div>
      <div class="flex gap-2">
        <UButton variant="outline" @click="chat.clearMessages()">Clear</UButton>
        <NuxtLink to="/connectors"><UButton variant="outline">Connectors</UButton></NuxtLink>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <UCard>
        <template #header><div class="font-medium">Conversation</div></template>
        <div class="max-h-[52vh] space-y-3 overflow-y-auto">
          <div
            v-for="message in chat.messages.value"
            :key="message.id"
            class="rounded-md border border-zinc-800 p-3 text-sm"
            :class="message.role === 'user' ? 'bg-zinc-900' : 'bg-zinc-950'"
          >
            <div class="mb-1 text-xs uppercase tracking-wide text-zinc-500">{{ message.role }}</div>
            <div class="whitespace-pre-wrap">{{ message.content }}</div>
          </div>
          <p v-if="!chat.messages.value.length" class="text-sm text-zinc-500">Start with a question or try /help.</p>
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
          <template #header><div class="font-medium">Stack synergy</div></template>
          <label class="mb-3 flex items-center gap-2 text-sm">
            <input type="checkbox" :checked="chat.preferences.value.showStackSynergy" @change="chat.toggleStackSynergy(($event.target as HTMLInputElement).checked)" />
            Include active stack in prompt
          </label>
          <pre class="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-zinc-400">{{ chat.stackSummary() }}</pre>
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
          <div class="max-h-48 space-y-2 overflow-y-auto">
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
          <template #header><div class="font-medium">Rules</div></template>
          <div class="space-y-2">
            <label v-for="rule in chat.rules" :key="rule.id" class="flex items-start gap-2 text-sm">
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

const chat = useChatSession()
const runtime = useAgentRuntime()
const draft = ref('')
const commandHint = computed(() => chat.slashHelp().slice(0, 3).join(' · '))

async function runAutomationWorkflow(workflowId: string | undefined, prompt: string) {
  if (workflowId === 'youtube-rag' && /https?:\/\//.test(prompt)) {
    const result = await indexYouTubeUrlsToRag({ text: prompt })
    return `YouTube RAG indexed ${result.indexed} video(s), skipped ${result.skipped}, failed ${result.failed}.`
  }
  if (workflowId === 'drive-rag') {
    const result = await syncDrivePdfsToRag()
    return `Drive RAG indexed ${result.indexed} PDF(s), skipped ${result.skipped}.`
  }
  return null
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
  chat.pushMessage({ role: 'assistant', content: latest, workflowId: task.parsed.workflowId })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void submit()
  }
}

onMounted(() => chat.refresh())
</script>
