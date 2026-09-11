import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DocumentRagIndex, emptyDocumentRagStore, saveDocumentRagStore, searchDocuments } from '../plugins/longevity/rag/document-index'
import { indexUploadedDocument } from '../plugins/longevity/rag/index-document'
import { indexTranscriptDocument } from '../plugins/longevity/rag/index-transcript'
import { orchestrateLLM } from '../app/services/llm-orchestrator'
import { buildChatPrompt, buildRagContextForQuery } from '../app/services/chat-session/conversation-context'
import { clearOpenRouterCatalogCache, selectProvidersForRequest } from '../app/services/llm-provider-bridge'
import type { LLMSettings } from '../app/types/llm'

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() { return store.size },
  }
}

describe('RAG document indexing with OpenRouter rotation', () => {
  let storage: Storage

  beforeEach(() => {
    storage = createMemoryStorage()
    saveDocumentRagStore(emptyDocumentRagStore(), storage)
    clearOpenRouterCatalogCache()
  })

  it('indexes a biohacking protocol document and retrieves relevant excerpts via RAG', () => {
    const protocolDocument = {
      documentId: 'doc-berberine-metformin-2026',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      filename: 'Berberine vs Metformin N-of-1 protocol evidence 2026.pdf',
      pageTexts: [
        {
          page: 1,
          text: `PROTOCOL OVERVIEW 2026: Berberine vs Metformin for Glucose Regulation & AMPK Activation.
Berberine hydrochloride dosed at 500mg TID with meals demonstrates comparable HbA1c reduction to Metformin 850mg BID.
Key biomarker endpoints tracked: fasting glucose, fasting insulin, HbA1c, HOMA-IR, and hs-CRP.`,
        },
        {
          page: 2,
          text: `N-of-1 TRIAL DESIGN & SAFETY MONITORING:
Phase A (Weeks 1-4): Baseline washout and continuous glucose monitoring (CGM).
Phase B (Weeks 5-10): Berberine 500mg TID with meals + milk thistle (silymarin) for P-glycoprotein inhibition to enhance bioavailability.
Phase C (Weeks 11-16): Metformin 850mg BID extended release.
GI tolerance markers: gastrointestinal distress incidence lower in silymarin co-administration.
Contraindications: do not combine high-dose berberine with macrolide antibiotics or CYP3A4 substrates without medical supervision.`,
        },
      ],
      extractionMethod: 'native-text' as const,
      storage,
    }

    const { chunks, store } = indexUploadedDocument(protocolDocument)
    expect(chunks.length).toBeGreaterThan(0)
    expect(store).not.toBeNull()

    // Query RAG for berberine and metformin protocol excerpts
    const query = 'What is the dosing and biomarker endpoint for the Berberine vs Metformin protocol?'
    const results = searchDocuments(query, 5, storage)

    expect(results.length).toBeGreaterThan(0)
    const topResult = results[0]
    expect(topResult).toBeDefined()
    expect(topResult?.content).toContain('Berberine hydrochloride dosed at 500mg TID')
    expect(topResult?.content).toContain('Metformin 850mg BID')

    // Context formatting for prompt
    const ragContext = buildRagContextForQuery(query, 3, storage)
    expect(ragContext).toContain('RAG excerpt')
    expect(ragContext).toContain('HbA1c')
    expect(ragContext).toContain('Berberine')
  })

  it('indexes transcript document and constructs chat prompt with RAG context', () => {
    const transcript = {
      documentId: 'transcript-dr-sinclair-longevity',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      title: 'AMPK Activators and Sirtuin Synergy Protocol 2026',
      plainText: `Welcome to the 2026 longevity masterclass.
Today we analyze berberine versus metformin in mitochondrial efficiency and AMPK phosphorylation.
Berberine acts via complex I mild inhibition, shifting the AMP/ATP ratio and stimulating AMPK.
Pairing with exercise timing is critical: avoid taking metformin immediately post-hypertrophy resistance training due to potential blunting of muscle protein synthesis signals.`,
      tags: ['biohacking', 'ampk', 'longevity', 'transcript'],
      storage,
    }

    const { chunks } = indexTranscriptDocument(transcript)
    expect(chunks.length).toBeGreaterThan(0)

    const chatBundle = buildChatPrompt({
      userPrompt: 'Should I take metformin or berberine after resistance training?',
      messages: [],
      includeRag: true,
      storage,
    })

    expect(chatBundle.ragContext).toContain('resistance training')
    expect(chatBundle.ragContext).toContain('muscle protein synthesis')
    expect(chatBundle.prompt).toContain('Relevant indexed documents:')
    expect(chatBundle.prompt).toContain('Should I take metformin or berberine after resistance training?')
  })

  it('orchestrates RAG prompt execution through OpenRouter with automatic provider fallback', async () => {
    // 1. Index test biohacking document into storage
    indexUploadedDocument({
      documentId: 'doc-berberine-evidence',
      sha256: 'abc123456789',
      filename: 'Berberine vs Metformin N-of-1 protocol evidence 2026.pdf',
      pageTexts: [
        {
          page: 1,
          text: 'Berberine 500mg TID yields similar AMPK activation to Metformin 850mg BID without reducing VO2max.',
        },
      ],
      storage,
    })

    // 2. Build RAG prompt with retrieved context
    const query = 'How does Berberine compare to Metformin for VO2max?'
    const ragContext = buildRagContextForQuery(query, 2, storage)
    expect(ragContext).toContain('VO2max')

    const prompt = `Based on the following documents:\n${ragContext}\n\nAnswer: ${query}`

    // 3. Configure LLM settings with OpenRouter as priority 1 and OpenAI as backup priority 2
    const settings: LLMSettings = {
      preferFree: false,
      autoRotate: true,
      showModel: true,
      allowFrameworkWrite: false,
      providers: [
        {
          provider: 'openrouter',
          model: 'openrouter/free',
          enabled: true,
          priority: 1,
          apiKey: 'sk-or-test-openrouter-key',
        },
        {
          provider: 'openai',
          model: 'gpt-5.6',
          enabled: true,
          priority: 2,
          apiKey: 'sk-test-openai-key',
        },
      ],
    }

    const orderedProviders = await selectProvidersForRequest(settings, { prompt })
    expect(orderedProviders[0]?.provider).toBe('openrouter')
    expect(orderedProviders[1]?.provider).toBe('openai')

    // 4. Mock fetch so OpenRouter fails (e.g. rate limit 429) and OpenAI succeeds with answer
    const networkCalls: Array<{ url: string; auth: string | null; body: any }> = []
    const originalFetch = globalThis.fetch

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const headers = new Headers(init?.headers)
      const body = init?.body ? JSON.parse(String(init.body)) : null
      networkCalls.push({ url, auth: headers.get('authorization'), body })

      if (url.includes('openrouter.ai')) {
        // Simulate OpenRouter rate limit or model busy failure
        return new Response(JSON.stringify({ error: { message: 'Rate limit exceeded on free tier', code: 429 } }), {
          status: 429,
          headers: { 'content-type': 'application/json' },
        })
      }

      if (url.includes('api.openai.com')) {
        // OpenAI succeeds
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content:
                    'Based on the provided evidence, Berberine 500mg TID provides comparable AMPK activation to Metformin 850mg BID without decreasing VO2max in the tracked protocol.',
                },
              },
            ],
            usage: { prompt_tokens: 45, completion_tokens: 35, total_tokens: 80 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }

      throw new Error(`Unexpected URL called: ${url}`)
    }) as unknown as typeof fetch

    try {
      const response = await orchestrateLLM({ prompt }, settings)

      expect(response.provider).toBe('openai')
      expect(response.model).toBe('gpt-5.6')
      expect(response.fallbackUsed).toBe(true)
      expect(response.attempts).toBe(2)
      expect(response.text).toContain('VO2max')
      expect(response.text).toContain('Berberine 500mg TID')

      // Verify network calls: First OpenRouter, then fallback to OpenAI
      expect(networkCalls).toHaveLength(2)
      expect(networkCalls[0]?.url).toContain('openrouter.ai')
      expect(networkCalls[0]?.body.messages[0].content).toContain('VO2max')
      expect(networkCalls[1]?.url).toContain('api.openai.com')
      expect(networkCalls[1]?.body.messages[0].content).toContain('VO2max')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('rotates across discovered OpenRouter free models when preferFree is enabled', async () => {
    // Index test protocol
    indexUploadedDocument({
      documentId: 'doc-fasting-metformin',
      sha256: 'def456',
      filename: 'Berberine vs Metformin N-of-1 protocol evidence 2026.pdf',
      pageTexts: [
        {
          page: 1,
          text: 'Continuous Glucose Monitoring (CGM) indicated reduced glycemic variability on Berberine 500mg TID.',
        },
      ],
      storage,
    })

    const query = 'Glycemic variability on Berberine'
    const ragContext = buildRagContextForQuery(query, 1, storage)
    expect(ragContext).toContain('CGM')

    const settings: LLMSettings = {
      preferFree: true,
      autoRotate: true,
      showModel: true,
      allowFrameworkWrite: false,
      providers: [
        {
          provider: 'openrouter',
          model: 'openrouter/free',
          enabled: true,
          priority: 1,
          apiKey: 'sk-or-test-openrouter-key',
        },
      ],
    }

    const networkCalls: Array<{ url: string; model: string }> = []
    const originalFetch = globalThis.fetch

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/models')) {
        // Return 2 free models from catalog
        return new Response(
          JSON.stringify({
            data: [
              {
                id: 'meta-llama/llama-3.3-70b-instruct:free',
                name: 'Llama 3.3 70B Free',
                context_length: 32768,
                pricing: { prompt: 0, completion: 0 },
                architecture: { output_modalities: ['text'] },
              },
              {
                id: 'google/gemini-2.0-flash-lite-preview:free',
                name: 'Gemini 2.0 Flash Lite Free',
                context_length: 16384,
                pricing: { prompt: 0, completion: 0 },
                architecture: { output_modalities: ['text'] },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }

      if (url.includes('/chat/completions')) {
        const body = init?.body ? JSON.parse(String(init.body)) : {}
        networkCalls.push({ url, model: body.model })

        // First free model fails with capacity error (503)
        if (body.model === 'meta-llama/llama-3.3-70b-instruct:free') {
          return new Response(
            JSON.stringify({ error: { message: 'Provider model is overloaded', code: 503 } }),
            { status: 503, headers: { 'content-type': 'application/json' } },
          )
        }

        // Second free model succeeds
        if (body.model === 'google/gemini-2.0-flash-lite-preview:free') {
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: 'CGM telemetry confirms reduced glycemic variability under Berberine 500mg TID.',
                  },
                },
              ],
              usage: { prompt_tokens: 30, completion_tokens: 20, total_tokens: 50 },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          )
        }
      }

      throw new Error(`Unexpected URL called: ${url}`)
    }) as unknown as typeof fetch

    try {
      const response = await orchestrateLLM({ prompt: `Context:\n${ragContext}\n\nSummarize glycemic variability` }, settings)

      expect(response.provider).toBe('openrouter')
      expect(response.model).toBe('google/gemini-2.0-flash-lite-preview:free')
      expect(response.fallbackUsed).toBe(true)
      expect(response.attempts).toBe(2)
      expect(response.text).toContain('CGM telemetry confirms reduced glycemic variability')

      expect(networkCalls).toHaveLength(2)
      expect(networkCalls[0]?.model).toBe('meta-llama/llama-3.3-70b-instruct:free')
      expect(networkCalls[1]?.model).toBe('google/gemini-2.0-flash-lite-preview:free')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
