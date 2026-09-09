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
})
