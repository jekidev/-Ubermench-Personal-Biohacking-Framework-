import { describe, expect, it } from 'vitest'
import { parseSlashCommand, listSlashCommands } from './slash-commands'
import { buildStackSynergySnapshot, formatStackSynergyContext } from './stack-synergy'
import { CHAT_WORKFLOWS } from './workflows'

describe('chat-session slash commands', () => {
  const enabled = CHAT_WORKFLOWS.map((workflow) => workflow.id)

  it('parses /stack workflow', () => {
    const result = parseSlashCommand('/stack magnesium glycine sleep', enabled)
    expect(result.workflowId).toBe('stack')
    expect(result.kind).toBe('biohacking')
    expect(result.prompt).toContain('magnesium')
  })

  it('parses /youtube workflow with URLs', () => {
    const result = parseSlashCommand('/youtube https://www.youtube.com/watch?v=abc12345678', enabled)
    expect(result.workflowId).toBe('youtube-rag')
    expect(result.prompt).toContain('abc12345678')
  })

  it('parses /youtube-sync workflow', () => {
    const result = parseSlashCommand('/youtube-sync', enabled)
    expect(result.workflowId).toBe('youtube-schedule')
  })

  it('parses /research with catalog tool names and no Sci-Hub', () => {
    const result = parseSlashCommand('/research NAD+ sleep', enabled)
    expect(result.workflowId).toBe('research')
    expect(result.prompt).toContain('research.europepmc')
    expect(result.prompt).toContain('mcp.stdio:paper-search')
    expect(result.prompt.toLowerCase()).not.toContain('sci-hub is required')
    expect(result.prompt).toContain('Do not use Sci-Hub')
  })

  it('lists enabled slash commands', () => {
    expect(listSlashCommands(enabled).some((line) => line.startsWith('/help'))).toBe(true)
  })
})

describe('chat-session stack synergy', () => {
  it('builds synergy snapshot with gaps when connectors disabled', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {},
    } as Pick<Storage, 'getItem' | 'setItem'>
    const snapshot = buildStackSynergySnapshot({
      enabledSkillIds: ['bio-research'],
      enabledRuleIds: ['stack-synergy'],
      enabledWorkflowIds: ['stack'],
      showStackSynergy: true,
    }, storage)
    expect(snapshot.synergies.length).toBeGreaterThan(0)
    expect(snapshot.gaps.some((gap) => gap.includes('Transcriptor'))).toBe(true)
    expect(formatStackSynergyContext(snapshot)).toContain('Active stack snapshot')
  })

  it('uses catalog MCP tool names on the literature skill, not the bare connector id', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {},
    } as Pick<Storage, 'getItem' | 'setItem'>
    const snapshot = buildStackSynergySnapshot({
      enabledSkillIds: ['scientific-literature-search'],
      enabledRuleIds: [],
      enabledWorkflowIds: [],
      showStackSynergy: true,
    }, storage)
    const literature = snapshot.skills.find((skill) => skill.id === 'scientific-literature-search')
    expect(literature?.tools).toContain('mcp.stdio:paper-search')
    expect(literature?.tools).not.toContain('paper-search')
  })
})
