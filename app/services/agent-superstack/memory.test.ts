import { describe, expect, it } from 'vitest'
import { AgentMemory } from './memory'

describe('agent memory search', () => {
  it('excludes records that only score from importance', () => {
    const memory = new AgentMemory()
    memory.add({ text: 'Omega 3 research', type: 'fact', tags: ['cardio'], importance: 0.8 })
    memory.add({ text: 'Unrelated note', type: 'fact', tags: [], importance: 0.1 })
    expect(memory.search('omega cardio')).toHaveLength(1)
  })

  it('returns no records for an empty query', () => {
    const memory = new AgentMemory()
    memory.add({ text: 'Omega 3 research', type: 'fact', tags: ['cardio'], importance: 0.8 })
    expect(memory.search('   ')).toEqual([])
  })
})
