<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Agent Control Center</h1>
        <p class="text-zinc-500">Closed-loop model, memory, skills and governance runtime.</p>
      </div>
      <NuxtLink to="/"><UButton variant="outline">Dashboard</UButton></NuxtLink>
    </div>

    <div class="grid gap-4 md:grid-cols-4">
      <UCard><div class="text-xs text-zinc-500">Status</div><div class="mt-2 text-xl font-semibold">{{ runtime.status.value }}</div></UCard>
      <UCard><div class="text-xs text-zinc-500">Model</div><div class="mt-2 text-sm font-medium">{{ runtime.activeRun.value?.selectedModel?.model ?? 'none' }}</div></UCard>
      <UCard><div class="text-xs text-zinc-500">Memory</div><div class="mt-2 text-xl font-semibold">{{ runtime.activeRun.value?.context.memories.length ?? 0 }}</div></UCard>
      <UCard><div class="text-xs text-zinc-500">Skills</div><div class="mt-2 text-xl font-semibold">{{ runtime.activeRun.value?.context.skills.length ?? 0 }}</div></UCard>
    </div>

    <UCard>
      <template #header><div class="font-medium">Run agent</div></template>
      <form class="space-y-3" @submit.prevent="submit">
        <textarea v-model="prompt" class="min-h-32 w-full rounded-md border border-zinc-200 bg-transparent p-3 text-sm dark:border-zinc-700" placeholder="Research, analyze, compare or plan..." />
        <div class="flex flex-wrap items-center gap-3">
          <select v-model="kind" class="rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700">
            <option value="chat">Chat</option><option value="research">Research</option><option value="biohacking">Biohacking</option><option value="coding">Coding</option><option value="automation">Automation</option>
          </select>
          <UButton type="submit" :loading="runtime.status.value === 'running'" :disabled="!prompt.trim()">Execute</UButton>
        </div>
        <div v-if="runtime.error.value" class="rounded-md border border-red-300 p-3 text-sm text-red-700">{{ runtime.error.value }}</div>
      </form>
    </UCard>

    <UCard v-if="runtime.activeRun.value">
      <template #header><div class="font-medium">Latest run</div></template>
      <div class="space-y-4">
        <div class="text-xs text-zinc-500">{{ runtime.activeRun.value.task.kind }} · {{ runtime.activeRun.value.status }} · {{ runtime.activeRun.value.selectedModel?.provider ?? 'no model' }}</div>
        <div v-for="item in runtime.activeRun.value.observations" :key="item.createdAt" class="whitespace-pre-wrap rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-700">{{ item.text }}</div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { AgentTaskKind } from '~/services/agent-superstack/types'
const runtime = useAgentRuntime()
const prompt = ref('')
const kind = ref<AgentTaskKind>('research')

async function submit() {
  await runtime.run({ id: `task_${Date.now()}`, kind: kind.value, prompt: prompt.value, requiredCapabilities: kind.value === 'research' ? ['research'] : ['reasoning'] })
}
</script>
