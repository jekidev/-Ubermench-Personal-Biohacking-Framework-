import { agentKernel } from '~/services/agent-superstack/kernel'
import type { AgentTask } from '~/services/agent-superstack/types'

export function useAgentKernel() {
  const lastContext = useState('ubermench-agent-context', () => null as ReturnType<typeof agentKernel.prepare> | null)
  const status = useState<'idle' | 'ready'>('ubermench-agent-status', () => 'idle')

  function prepare(task: AgentTask) {
    const context = agentKernel.prepare(task)
    lastContext.value = context
    status.value = 'ready'
    return context
  }

  function remember(text: string, type: 'episodic' | 'semantic' | 'preference' | 'fact' | 'decision' = 'episodic', tags: string[] = [], importance = 0.5) {
    return agentKernel.remember(text, type, tags, importance)
  }

  return { kernel: agentKernel, lastContext, status, prepare, remember }
}
