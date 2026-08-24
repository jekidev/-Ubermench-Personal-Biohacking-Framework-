import { describe, expect, it } from 'vitest'
import { authorizeLlmAction } from './action-policy'

const actions = [
  'network-search', 'scrape', 'rag-read',
  'create', 'update', 'delete', 'send', 'store', 'execute',
] as const

describe('LLM approval gate integration contract', () => {
  it.each(actions)('fails closed for %s without approval', (action) => {
    expect(() => authorizeLlmAction(action, { tauriRuntime: true })).toThrow()
  })

  it('never permits destructive actions outside Tauri', () => {
    for (const action of ['create', 'update', 'delete', 'send', 'store', 'execute'] as const) {
      expect(() => authorizeLlmAction(action, { decision: 'approved' })).toThrow(/Tauri runtime/)
    }
  })

  it('permits retrieval only after explicit approval', () => {
    for (const action of ['network-search', 'scrape', 'rag-read'] as const) {
      expect(() => authorizeLlmAction(action, { decision: 'approved' })).not.toThrow()
    }
  })
})
