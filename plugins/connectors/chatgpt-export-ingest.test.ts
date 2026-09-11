import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  emptyChatGptExportIngestStore,
  ingestChatGptExportJson,
  loadChatGptExportIngestStore,
  saveChatGptExportIngestStore,
} from './chatgpt-export-ingest'
import { loadDocumentRagStore } from '../longevity/rag/document-index'

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/chatgpt-export-minimal.json')
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))

describe('chatgpt-export-ingest', () => {
  it('indexes ChatGPT conversations into document RAG', async () => {
    const storage = new Map<string, string>()
    const result = await ingestChatGptExportJson({
      raw: fixture,
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
    })

    expect(result.indexed).toBe(1)
    expect(result.conversations[0]?.chunks).toBeGreaterThan(0)
    expect(loadChatGptExportIngestStore({
      getItem: (key) => storage.get(key) ?? null,
    }).syncedConversationIds).toContain('conv-1')

    const ragStore = loadDocumentRagStore({
      getItem: (key) => storage.get(key) ?? null,
    })
    expect(ragStore.chunks.some((chunk) => chunk.tags.includes('chatgpt'))).toBe(true)
    expect(ragStore.chunks.some((chunk) => chunk.content.includes('80-90C'))).toBe(true)
  })

  it('skips already synced conversations unless forced', async () => {
    const storage = new Map<string, string>()
    const store = { ...emptyChatGptExportIngestStore(), syncedConversationIds: ['conv-1'] }
    saveChatGptExportIngestStore(store, {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    })

    const skipped = await ingestChatGptExportJson({
      raw: fixture,
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
    })
    expect(skipped.skipped).toBe(1)
    expect(skipped.indexed).toBe(0)
  })
})
