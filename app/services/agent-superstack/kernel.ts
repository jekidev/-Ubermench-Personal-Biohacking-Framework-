import type { AgentTask, AgentContext } from './types'
import { AgentMemory } from './memory'
import { createDefaultModelRouter, ModelRouter } from './model-router'
import { createDefaultSkillRegistry, SkillRegistry } from './skills'
import { evaluateTask } from './governance'
import { KnowledgeGraph } from './knowledge-graph'

export class AgentKernel {
  readonly memory: AgentMemory
  readonly skills: SkillRegistry
  readonly graph: KnowledgeGraph
  readonly router: ModelRouter

  constructor(options?: { memory?: AgentMemory; skills?: SkillRegistry; graph?: KnowledgeGraph; router?: ModelRouter }) {
    this.memory = options?.memory ?? new AgentMemory()
    this.skills = options?.skills ?? createDefaultSkillRegistry()
    this.graph = options?.graph ?? new KnowledgeGraph()
    this.router = options?.router ?? createDefaultModelRouter()
  }

  prepare(task: AgentTask): AgentContext {
    const policy = evaluateTask(task)
    const memories = this.memory.search(task.prompt)
    const matched = this.skills.match(task.prompt)
    const skills = matched.length ? matched : this.skills.list().slice(0, 3)
    const selectedModel = this.router.select(task)
    return { task, memories, skills, selectedModel, policy }
  }

  remember(text: string, type: 'episodic' | 'semantic' | 'preference' | 'fact' | 'decision' = 'episodic', tags: string[] = [], importance = 0.5) {
    return this.memory.add({ text, type, tags, importance })
  }

  learnFromTask(task: AgentTask, outcome: string): void {
    this.remember(`Task: ${task.prompt}\nOutcome: ${outcome}`, 'episodic', [task.kind], 0.65)
    if (outcome.toLowerCase().includes('success')) this.skills.evolve(task.prompt, 'Automatically evolved from a successful task execution')
  }
}

export const agentKernel = new AgentKernel()
