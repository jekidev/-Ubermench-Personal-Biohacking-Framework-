import { KnowledgeGraph } from '~/services/agent-superstack/knowledge-graph'
import type { AgentRun } from './types'

export function recordRunInKnowledgeGraph(graph: KnowledgeGraph, run: AgentRun): void {
  const taskId = `task:${run.id}`
  graph.addNode({ id: taskId, type: 'task', label: run.task.prompt })
  graph.addNode({ id: `model:${run.selectedModel?.id ?? 'none'}`, type: 'model', label: run.selectedModel?.model ?? 'none' })
  graph.addEdge({ source: taskId, target: `model:${run.selectedModel?.id ?? 'none'}`, relation: 'used-model', weight: 1 })
  for (const memory of run.context.memories) {
    const memoryId = `memory:${memory.id}`
    graph.addNode({ id: memoryId, type: 'memory', label: memory.text })
    graph.addEdge({ source: taskId, target: memoryId, relation: 'retrieved-memory', weight: Math.max(0.1, memory.importance) })
  }
  for (const skill of run.context.skills) {
    const skillId = `skill:${skill.id}`
    graph.addNode({ id: skillId, type: 'skill', label: skill.name })
    graph.addEdge({ source: taskId, target: skillId, relation: 'used-skill', weight: 1 })
  }
}
