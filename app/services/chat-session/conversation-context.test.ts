import { describe, expect, it } from 'vitest'
import { buildChatPrompt, buildConversationHistory } from './conversation-context'
import type { ChatMessage } from './types'

const messages: ChatMessage[] = [
  { id: '1', role: 'user', content: 'What about NAD+?', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: '2', role: 'assistant', content: 'NAD+ supports mitochondrial function.', createdAt: '2026-01-01T00:01:00.000Z' },
]

describe('conversation-context', () => {
  it('builds multi-turn history', () => {
    expect(buildConversationHistory(messages)).toHaveLength(2)
  })

  it('includes conversation and latest user message in prompt', () => {
    const result = buildChatPrompt({
      userPrompt: 'Any synergy with magnesium?',
      messages,
      includeRag: false,
    })
    expect(result.prompt).toContain('Conversation so far')
    expect(result.prompt).toContain('Latest user message')
    expect(result.prompt).toContain('magnesium')
  })
})
