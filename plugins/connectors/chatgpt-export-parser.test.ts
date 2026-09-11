import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  conversationToPlainText,
  parseChatGptConversation,
  parseChatGptExportJson,
} from './chatgpt-export-parser'

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/chatgpt-export-minimal.json')
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))

describe('chatgpt-export-parser', () => {
  it('parses standard ChatGPT export conversations', () => {
    const conversations = parseChatGptExportJson(fixture)
    expect(conversations).toHaveLength(1)
    expect(conversations[0]?.title).toBe('Sauna protocol')
    expect(conversations[0]?.messages).toHaveLength(2)
    expect(conversations[0]?.messages[0]?.role).toBe('user')
    expect(conversations[0]?.messages[1]?.text).toContain('80-90C')
  })

  it('walks mapping from current_node', () => {
    const conversation = parseChatGptConversation(fixture[0])
    expect(conversation.messages.map((message) => message.role)).toEqual(['user', 'assistant'])
  })

  it('renders plain text for RAG chunking', () => {
    const conversation = parseChatGptConversation(fixture[0])
    const text = conversationToPlainText(conversation)
    expect(text).toContain('Title: Sauna protocol')
    expect(text).toContain('[user]')
    expect(text).toContain('heat shock proteins')
  })
})
