import type { AgentSkill } from './types'

export class SkillRegistry {
  private skills = new Map<string, AgentSkill>()

  register(skill: AgentSkill): void { this.skills.set(skill.id, skill) }
  unregister(id: string): void { this.skills.delete(id) }
  list(): AgentSkill[] { return [...this.skills.values()].filter((skill) => skill.enabled) }

  match(prompt: string): AgentSkill[] {
    const text = prompt.toLowerCase()
    return this.list().filter((skill) => skill.triggers.some((trigger) => text.includes(trigger.toLowerCase())))
  }

  evolve(prompt: string, description = 'Generated from observed task'): AgentSkill {
    const words = prompt.toLowerCase().split(/\s+/).filter((word) => word.length > 4).slice(0, 5)
    const id = `evolved_${Date.now()}`
    const skill: AgentSkill = { id, name: `Evolved: ${words.join('-') || 'task'}`, description, triggers: words, tools: [], enabled: true }
    this.register(skill)
    return skill
  }
}

export function createDefaultSkillRegistry(): SkillRegistry {
  const registry = new SkillRegistry()
  registry.register({ id: 'bio-research', name: 'Biohacking Research', description: 'Structures evidence-oriented personal biology research.', triggers: ['biohacking', 'biomarker', 'supplement', 'longevity', 'research'], tools: ['web', 'evidence-engine', 'plugins.pdf.inspect', 'plugins.garmin.status'], enabled: true })
  registry.register({ id: 'coding-agent', name: 'Coding Agent', description: 'Plans, edits and validates software changes.', triggers: ['code', 'coding', 'debug', 'implement', 'github'], tools: ['filesystem', 'git', 'tests'], enabled: true })
  registry.register({ id: 'deep-research', name: 'Deep Research', description: 'Breaks complex questions into evidence-backed research tasks.', triggers: ['deep research', 'compare', 'investigate'], tools: ['web', 'knowledge-graph'], enabled: true })
  registry.register({ id: 'automation', name: 'Automation', description: 'Executes bounded tool workflows.', triggers: ['automate', 'automation', 'schedule'], tools: ['mcp', 'scheduler'], enabled: true })
  registry.register({ id: 'scientific-literature-search', name: 'Scientific literature search', description: 'Searches open literature via paper-search-mcp and Europe PMC. Never uses Sci-Hub.', triggers: ['pubmed', 'paper search', 'literature', 'europe pmc', 'arxiv'], tools: ['paper-search', 'europe-pmc', 'research.europepmc'], enabled: true })
  registry.register({ id: 'scientific-methods-critique', name: 'Scientific methods critique', description: 'Separates mechanistic plausibility from human-outcome evidence and flags weak methods.', triggers: ['methods', 'study design', 'evidence grade', 'bias', 'n-of-1'], tools: ['evidence-engine'], enabled: true })
  registry.register({ id: 'local-deep-research', name: 'Local Deep Research', description: 'Optional cited research sidecar. Requires ldr-mcp and explicit approval.', triggers: ['local deep research', 'ldr', 'cited report'], tools: ['local-deep-research'], enabled: true })
  registry.register({
    id: 'longevity-plugins',
    name: 'Longevity plugins',
    description: 'Garmin live status, lab PDF inspect, MIT exercise catalog, and geroscience watchlist.',
    triggers: ['garmin', 'lab pdf', 'bloods pdf', 'exercise catalog', 'watchlist', 'geroscience'],
    tools: ['plugins.status', 'plugins.garmin.status', 'plugins.pdf.inspect', 'plugins.exercises.search', 'plugins.watchlist.list'],
    enabled: true,
  })
  return registry
}
