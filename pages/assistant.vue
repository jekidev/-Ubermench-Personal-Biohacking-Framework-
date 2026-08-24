<script setup lang="ts">
import type { ChatMessage } from '~/lib/llm/types'
import { runAgent } from '~/lib/llm/agent'
import { useLLMSettings } from '~/lib/llm/store'

const { settings, load } = useLLMSettings()
onMounted(load)
const input = ref(''); const busy = ref(false); const messages = ref<ChatMessage[]>([]); const activeModel = ref('not connected'); const toolActivity = ref<string[]>([])
async function send() {
  const text = input.value.trim(); if (!text || busy.value) return
  messages.value.push({ role: 'user', content: text }); input.value = ''; busy.value = true; toolActivity.value = ['Agent is inspecting the framework…']
  try { const result = await runAgent(messages.value); messages.value.push({ role: 'assistant', content: result.content }); activeModel.value = `${result.activeModel.provider} · ${result.activeModel.model}${result.activeModel.free ? ' · FREE' : ''}`; toolActivity.value = settings.value.showToolActivity ? ['Framework tools and enabled MCP servers were available to the agent.'] : [] }
  catch (error) { messages.value.push({ role: 'assistant', content: `Agent error: ${error instanceof Error ? error.message : String(error)}` }) }
  finally { busy.value = false }
}
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-5">
    <div class="flex flex-wrap items-end justify-between gap-3"><div><p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ubermench Agent</p><h1 class="mt-2 text-3xl font-semibold tracking-tight">Framework LLM</h1><p class="mt-2 max-w-3xl text-sm text-muted">Ask it to search, inspect, change or run things inside the framework. Enabled MCP servers are part of the same tool surface.</p></div><UBadge variant="subtle">{{ activeModel }}</UBadge></div>
    <UCard class="min-h-[520px]"><div class="space-y-4"><div v-for="(message, i) in messages" :key="i" class="rounded-lg border border-zinc-800 p-3"><div class="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{{ message.role }}</div><pre class="whitespace-pre-wrap break-words text-sm">{{ message.content }}</pre></div><div v-if="!messages.length" class="py-20 text-center text-sm text-muted">Try: “Find where cardiovascular risk is calculated and explain the code.” or “Add a new page for …”</div></div></UCard>
    <div v-if="toolActivity.length" class="text-xs text-muted">{{ toolActivity.join(' · ') }}</div>
    <form class="flex gap-2" @submit.prevent="send"><UInput v-model="input" size="lg" class="flex-1" placeholder="Ask the framework agent…" :disabled="busy" /><UButton type="submit" size="lg" :loading="busy">Send</UButton></form>
    <p class="text-xs text-muted">Provider/model is resolved automatically. The current provider and exact model are shown above after every completed turn.</p>
  </div>
</template>
