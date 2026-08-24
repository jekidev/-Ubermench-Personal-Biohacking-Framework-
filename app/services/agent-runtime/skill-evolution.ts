import type { AgentSkill } from '~/services/agent-superstack/types'

export interface SkillCandidate {
  name: string
  description: string
  triggers: string[]
  evidence: string
  confidence: number
}

export class SkillEvolutionEngine {
  private readonly pending: SkillCandidate[] = []

  propose(prompt: string, outcome: string): SkillCandidate | undefined {
    if (!/success|completed|resolved|fixed/i.test(outcome)) return undefined
    const triggers = prompt.toLowerCase().split(/\s+/).filter((word) => word.length > 4).slice(0, 5)
    if (!triggers.length) return undefined
    const candidate = { name: `Observed: ${triggers.join('-')}`, description: `Candidate skill inferred from a successful task: ${prompt}`, triggers, evidence: outcome, confidence: Math.min(0.9, 0.55 + triggers.length * 0.07) }
    this.pending.push(candidate)
    return candidate
  }

  approve(candidate: SkillCandidate): AgentSkill {
    return { id: `evolved_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: candidate.name, description: candidate.description, triggers: candidate.triggers, tools: [], enabled: true }
  }

  listPending(): SkillCandidate[] { return [...this.pending] }
  clear(): void { this.pending.length = 0 }
}
