import { describe, expect, it } from 'vitest'
import { authorizeLlmAction } from './action-policy'

describe('LLM human approval gate', () => {
  it('blocks network retrieval without explicit approval', () => {
    expect(() => authorizeLlmAction('network-search', {})).toThrow('explicit user approval')
  })

  it('blocks RAG reads without explicit approval', () => {
    expect(() => authorizeLlmAction('rag-read', {})).toThrow('explicit user approval')
  })

  it('blocks destructive actions outside Tauri', () => {
    expect(() => authorizeLlmAction('delete', { decision: 'approved' })).toThrow('requires the Tauri runtime')
  })

  it('allows an approved Tauri action', () => {
    expect(() => authorizeLlmAction('update', { decision: 'approved', tauriRuntime: true })).not.toThrow()
  })

  it('does not treat an undefined decision as approval', () => {
    expect(() => authorizeLlmAction('send', { tauriRuntime: true })).toThrow('explicit user approval')
  })
})
