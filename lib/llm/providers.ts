import { invoke } from '@tauri-apps/api/core'
import type { ActiveModel, ChatMessage, ChatResult, LLMTool, LLMProvider, ToolCall } from './types'

const FALLBACK_FREE = 'openrouter/free'

type OpenAIResponse = { choices?: Array<{ message?: { content?: string; tool_calls?: Array<{ id: string; type: string; function?: { name?: string; arguments?: string } }> } }>; model?: string; usage?: Record<string, unknown> }

function parseToolCalls(message: any): ToolCall[] {
  return (message?.tool_calls ?? []).map((tc: any) => ({ id: String(tc.id), name: String(tc.function?.name ?? ''), arguments: (() => { try { return JSON.parse(String(tc.function?.arguments ?? '{}')) } catch { return {} } })() }))
}

async function secret(provider: LLMProvider) { try { return await invoke<string>('llm_get_secret', { provider }) } catch { return '' } }

async function openAICompatible(baseUrl: string, key: string, provider: LLMProvider, model: string, messages: ChatMessage[], tools: LLMTool[]): Promise<ChatResult> {
  const body: Record<string, unknown> = { model, messages: messages.map(m => ({ role: m.role, content: m.content })), temperature: 0.2, max_tokens: 4000 }
  if (tools.length) { body.tools = tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } })); body.tool_choice = 'auto' }
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error(`${provider} ${response.status}: ${(await response.text()).slice(0, 500)}`)
  const json = await response.json() as OpenAIResponse
  const msg = json.choices?.[0]?.message ?? {}
  const toolCalls = parseToolCalls(msg)
  const actualModel = String(json.model ?? model)
  return { content: String(msg.content ?? ''), activeModel: { provider, model: actualModel, displayName: actualModel, free: provider === 'openrouter' && (model === FALLBACK_FREE || model.endsWith(':free')) }, toolCalls, usage: json.usage }
}

async function anthropic(key: string, model: string, messages: ChatMessage[], tools: LLMTool[]): Promise<ChatResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model, max_tokens: 4000, messages: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'tool' ? 'user' : m.role, content: m.content })), system: messages.find(m => m.role === 'system')?.content, tools: tools.map(t => ({ name: t.name, description: t.description, input_schema: t.input_schema })) }),
  })
  if (!response.ok) throw new Error(`anthropic ${response.status}: ${(await response.text()).slice(0, 500)}`)
  const json = await response.json(); const content = Array.isArray(json.content) ? json.content : []
  const text = content.filter((x: any) => x.type === 'text').map((x: any) => x.text).join('')
  const toolCalls = content.filter((x: any) => x.type === 'tool_use').map((x: any) => ({ id: String(x.id), name: String(x.name), arguments: x.input ?? {} }))
  const actualModel = String(json.model ?? model)
  return { content: text, activeModel: { provider: 'anthropic', model: actualModel, displayName: actualModel, free: false }, toolCalls, usage: json.usage }
}

export async function discoverOpenRouterModels() {
  const key = await secret('openrouter'); if (!key) return []
  const response = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${key}` } })
  if (!response.ok) throw new Error(`OpenRouter /models ${response.status}`)
  const json = await response.json()
  return (json.data ?? []).filter((m: any) => Number(m.pricing?.prompt ?? 0) === 0 && Number(m.pricing?.completion ?? 0) === 0).filter((m: any) => (m.architecture?.output_modalities ?? []).length === 0 || m.architecture.output_modalities.includes('text')).sort((a: any, b: any) => Number(b.context_length ?? 0) - Number(a.context_length ?? 0))
}

export async function sendWithProvider(provider: LLMProvider, requestedModel: string | undefined, messages: ChatMessage[], tools: LLMTool[]): Promise<ChatResult> {
  if (provider === 'openrouter') { const key = await secret('openrouter'); if (!key) throw new Error('OpenRouter API key is missing.'); return openAICompatible('https://openrouter.ai/api/v1', key, provider, requestedModel || FALLBACK_FREE, messages, tools) }
  if (provider === 'openai') { const key = await secret('openai'); if (!key) throw new Error('OpenAI API key is missing.'); return openAICompatible('https://api.openai.com/v1', key, provider, requestedModel || 'gpt-5-mini', messages, tools) }
  const key = await secret('anthropic'); if (!key) throw new Error('Anthropic API key is missing.')
  return anthropic(key, requestedModel || 'claude-sonnet-4-5', messages, tools)
}
