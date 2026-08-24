import type { ChatMessage, ChatResult, LLMProvider } from './types'
import { discoverOpenRouterModels, sendWithProvider } from './providers'
import { FRAMEWORK_TOOLS, executeFrameworkTool } from './framework-tools'
import { useLLMSettings } from './store'

const SYSTEM = `You are the embedded Ubermench Framework Agent. You have access to the framework itself through tools. Never invent framework state when you can inspect it. Before changing files, inspect relevant files first. Use framework search aggressively. You may call enabled MCP servers through the MCP tools. Always distinguish what you directly read from what you inferred. The user expects action, not just advice, when a requested framework operation is possible.`

async function chooseProvider(): Promise<{ provider: LLMProvider; model?: string }> {
  const { settings } = useLLMSettings()
  const pref = settings.value.preferredProvider
  if (pref !== 'auto') return { provider: pref }
  try {
    const free = await discoverOpenRouterModels()
    if (free.length && import.meta.client) {
      const key = 'ubermench.openrouter.rotation.index.v1'
      const cursor = Number(localStorage.getItem(key) ?? '0')
      const model = free[cursor % free.length]
      localStorage.setItem(key, String((cursor + 1) % free.length))
      return { provider: 'openrouter', model: model.id }
    }
  } catch {}
  return { provider: 'openrouter', model: 'openrouter/free' }
}

export async function runAgent(history: ChatMessage[]): Promise<ChatResult> {
  const { settings } = useLLMSettings()
  const selected = await chooseProvider()
  let messages: ChatMessage[] = [{ role: 'system', content: SYSTEM }, ...history]
  let last: ChatResult | undefined
  for (let step = 0; step < 8; step++) {
    last = await sendWithProvider(selected.provider, selected.model, messages, FRAMEWORK_TOOLS)
    if (!last.toolCalls?.length) return last
    if (last.content) messages.push({ role: 'assistant', content: last.content })
    for (const call of last.toolCalls) {
      let result: unknown
      try { result = await executeFrameworkTool(call.name, call.arguments, settings.value.allowFrameworkWrite) }
      catch (error) { result = { error: error instanceof Error ? error.message : String(error) } }
      messages.push({ role: 'user', content: `TOOL RESULT [${call.name}]:\n${JSON.stringify(result).slice(0, 120000)}` })
    }
  }
  return last ?? { content: 'Agent stopped after reaching the tool-call safety limit.', activeModel: { provider: selected.provider, model: selected.model || 'auto', displayName: selected.model || 'auto', free: selected.provider === 'openrouter' } }
}
