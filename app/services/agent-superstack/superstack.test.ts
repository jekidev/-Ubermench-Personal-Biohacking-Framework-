import { describe, expect, it } from 'vitest'
import { AgentMemory } from './memory'
import { ModelRouter } from './model-router'
import { evaluateTask } from './governance'
import { SkillRegistry } from './skills'
import { AgentKernel } from './kernel'

describe('agent superstack', () => {
  it('retrieves relevant memory', () => {
    const memory = new AgentMemory()
    memory.add({ text: 'Omega 3 research', type: 'fact', tags: ['cardio'], importance: 0.8 })
    memory.add({ text: 'Unrelated note', type: 'fact', tags: [], importance: 0.1 })
    expect(memory.search('omega cardio')).toHaveLength(1)
  })

  it('selects a model satisfying capabilities', () => {
    const router = new ModelRouter([{ id: 'x', provider: 'test', model: 'reasoner', baseUrl: 'http://localhost', capabilities: ['reasoning', 'research'], costTier: 'free', enabled: true, priority: 1 }])
    expect(router.select({ id: '1', kind: 'research', prompt: 'research', requiredCapabilities: ['research'] })?.id).toBe('x')
  })

  it('does not select a model missing a required capability', () => {
    const router = new ModelRouter([{ id: 'x', provider: 'test', model: 'fast', baseUrl: 'http://localhost', capabilities: ['fast'], costTier: 'free', enabled: true, priority: 1 }])
    expect(router.select({ id: '1', kind: 'research', prompt: 'research', requiredCapabilities: ['research'] })).toBeUndefined()
  })

  it('does not select disabled models', () => {
    const router = new ModelRouter([{ id: 'x', provider: 'test', model: 'disabled', baseUrl: 'http://localhost', capabilities: ['research'], costTier: 'free', enabled: false, priority: 1 }])
    expect(router.select({ id: '1', kind: 'research', prompt: 'research', requiredCapabilities: ['research'] })).toBeUndefined()
  })

  it('matches skills and guards destructive operations', () => {
    const skills = new SkillRegistry()
    skills.register({ id: 'coding', name: 'Coding', description: '', triggers: ['debug'], tools: [], enabled: true })
    expect(skills.match('please debug this')).toHaveLength(1)
    expect(evaluateTask({ id: '1', kind: 'coding', prompt: 'rm -rf /', allowTools: true })).toMatchObject({ requiresConfirmation: true })
  })

  it('builds an execution context', () => {
    const kernel = new AgentKernel()
    const context = kernel.prepare({ id: '1', kind: 'biohacking', prompt: 'research biomarkers', requiredCapabilities: ['research'] })
    expect(context.selectedModel).toBeDefined()
    expect(context.skills.length).toBeGreaterThan(0)
    expect(context.policy.allowed).toBe(true)
  })
})
