import { KnowledgeGraph } from '~/services/agent-superstack/knowledge-graph'
import type { AgentRun } from './types'

const graphNode = (id: string, type: string, label: string) => ({ id, type, label, properties: {} })

export function recordRunInKnowledgeGraph(graph: KnowledgeGraph, run: AgentRun): void {
  const taskId = `task:${run.id}`
  const modelId = `model:${run.selectedModel?.id ?? 'none'}`
  graph.upsertNode(graphNode(taskId, 'task', run.task.prompt))
  graph.upsertNode(graphNode(modelId, 'model', run.selectedModel?.model ?? 'none'))
  graph.connect(taskId, modelId, 'used-model', 1)
  for (const memory of run.context.memories) {
    const memoryId = `memory:${memory.id}`
    graph.upsertNode(graphNode(memoryId, 'memory', memory.text))
    graph.connect(taskId, memoryId, 'retrieved-memory', Math.max(0.1, memory.importance))
  }
  for (const skill of run.context.skills) {
    const skillId = `skill:${skill.id}`
    graph.upsertNode(graphNode(skillId, 'skill', skill.name))
    graph.connect(taskId, skillId, 'used-skill', 1)
  }
}
