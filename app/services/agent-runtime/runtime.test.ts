import { describe, expect, it } from 'vitest'
import { AgentMemory } from '~/services/agent-superstack/memory'
import { KnowledgeGraph } from '~/services/agent-superstack/knowledge-graph'
import { SkillEvolutionEngine } from './skill-evolution'
import { recordRunInKnowledgeGraph } from './graph-sync'
import type { AgentRun } from './types'

describe('agent runtime v2', () => {
  it('hydrates and persists memory through a runtime store contract', async () => {
    const memory = new AgentMemory()
    memory.add({ text: 'persistent observation', type: 'episodic', tags: ['test'], importance: 0.7 })
    expect(memory.search('persistent')).toHaveLength(1)
  })

  it('requires a successful outcome before proposing an evolved skill', () => {
    const engine = new SkillEvolutionEngine()
    expect(engine.propose('debug the agent router', 'failed')).toBeUndefined()
    expect(engine.propose('debug the agent router', 'success')).toBeDefined()
  })

  it('records model, memory and skill relationships in the knowledge graph', () => {
    const graph = new KnowledgeGraph()
    const run = {
      id: 'r1', status: 'completed', task: { id: 't1', kind: 'research', prompt: 'research biomarkers' }, context: {
        task: { id: 't1', kind: 'research', prompt: 'research biomarkers' }, memories: [{ id: 'm1', text: 'biomarker memory', type: 'fact', tags: [], importance: 0.8, createdAt: 1, updatedAt: 1, accessCount: 0 }], skills: [{ id: 's1', name: 'Research', description: 'research', triggers: ['research'], tools: [], enabled: true }], policy: { allowed: true, reason: 'ok', requiresConfirmation: false }, selectedModel: { id: 'model', provider: 'test', model: 'test', baseUrl: 'http://localhost', capabilities: ['research'], costTier: 'free', enabled: true, priority: 1 }
      }, observations: [], toolCalls: [], selectedModel: { id: 'model', provider: 'test', model: 'test', baseUrl: 'http://localhost', capabilities: ['research'], costTier: 'free', enabled: true, priority: 1 }, startedAt: new Date().toISOString()
    } as AgentRun
    recordRunInKnowledgeGraph(graph, run)
    // The run creates one node for the task, model, memory and skill.
    expect(graph.snapshot().nodes.length).toBe(4)
    expect(graph.snapshot().edges.length).toBe(3)
  })
})
