import { createDefaultSkillRegistry } from '~/services/agent-superstack/skills'
import { CONNECTOR_REGISTRY } from '../../../plugins/connectors/registry'
import { isConnectorEnabled } from '../../../plugins/connectors/connector-store'
import type { ConnectorId } from '../../../plugins/connectors/types'
import { CHAT_RULES } from './rules'
import { CHAT_WORKFLOWS } from './workflows'
import type { ChatRunOptions } from './types'

export type StackSynergySnapshot = {
  skills: Array<{ id: string; name: string; tools: string[] }>
  rules: Array<{ id: string; name: string; category: string }>
  workflows: Array<{ id: string; name: string; slash: string }>
  connectors: Array<{ id: string; name: string; capabilities: string[]; enabled: boolean }>
  synergies: string[]
  gaps: string[]
}

export function buildStackSynergySnapshot(options: ChatRunOptions, storage?: Pick<Storage, 'getItem' | 'setItem'>): StackSynergySnapshot {
  const skillRegistry = createDefaultSkillRegistry()
  const enabledSkillIds = new Set(options.enabledSkillIds ?? skillRegistry.list().map((skill) => skill.id))
  const enabledRuleIds = new Set(options.enabledRuleIds ?? CHAT_RULES.filter((rule) => rule.enabled).map((rule) => rule.id))
  const enabledWorkflowIds = new Set(options.enabledWorkflowIds ?? CHAT_WORKFLOWS.filter((workflow) => workflow.enabled).map((workflow) => workflow.id))

  const skills = skillRegistry.list()
    .filter((skill) => enabledSkillIds.has(skill.id))
    .map((skill) => ({ id: skill.id, name: skill.name, tools: skill.tools }))

  const rules = CHAT_RULES
    .filter((rule) => enabledRuleIds.has(rule.id))
    .map((rule) => ({ id: rule.id, name: rule.name, category: rule.category }))

  const workflows = CHAT_WORKFLOWS
    .filter((workflow) => enabledWorkflowIds.has(workflow.id))
    .map((workflow) => ({ id: workflow.id, name: workflow.name, slash: workflow.slash }))

  const connectors = CONNECTOR_REGISTRY
    .filter((connector) => ['youtube-rag', 'transcriptor', 'google-drive', 'paper-search', 'paper-qa', 'local-deep-research'].includes(connector.id))
    .map((connector) => ({
      id: connector.id,
      name: connector.name,
      capabilities: connector.capabilities,
      enabled: storage
        ? isConnectorEnabled(connector.id as ConnectorId, storage as Storage)
        : isConnectorEnabled(connector.id as ConnectorId),
    }))

  const synergies: string[] = []
  const gaps: string[] = []

  if (skills.some((skill) => skill.id === 'bio-research') && rules.some((rule) => rule.id === 'stack-synergy')) {
    synergies.push('Biohacking research skill + stack synergy rule → interaction-aware supplement/protocol answers.')
  }
  if (connectors.find((item) => item.id === 'youtube-rag')?.enabled && skills.some((skill) => skill.tools.includes('paper-search') || skill.id === 'scientific-literature-search')) {
    synergies.push('YouTube RAG + literature search → combine podcast claims with published evidence.')
  }
  if (connectors.find((item) => item.id === 'google-drive')?.enabled) {
    synergies.push('Drive RAG + biohacking chat → ground answers in your own lab PDFs.')
  }
  if (workflows.some((workflow) => workflow.id === 'stack')) {
    synergies.push('/stack workflow → explicit synergy mapping for supplements, protocols, and connectors.')
  }

  if (!connectors.find((item) => item.id === 'youtube-rag')?.enabled) {
    gaps.push('Enable YouTube → RAG on /connectors to ingest podcast transcripts automatically.')
  }
  if (!connectors.find((item) => item.id === 'transcriptor')?.enabled) {
    gaps.push('Enable Transcriptor MCP for playlists, channel search, and caption-less videos (optional Docker sidecar).')
  }
  if (!connectors.find((item) => item.id === 'paper-search')?.enabled) {
    gaps.push('Enable Paper Search MCP to verify podcast claims against open literature.')
  }

  return { skills, rules, workflows, connectors, synergies, gaps }
}

export function formatStackSynergyContext(snapshot: StackSynergySnapshot): string {
  const lines = [
    'Active stack snapshot:',
    `Skills: ${snapshot.skills.map((skill) => skill.name).join(', ') || 'none'}`,
    `Rules: ${snapshot.rules.map((rule) => rule.name).join(', ') || 'none'}`,
    `Workflows: ${snapshot.workflows.map((workflow) => workflow.slash).join(', ') || 'none'}`,
    `Connectors: ${snapshot.connectors.filter((item) => item.enabled).map((item) => item.name).join(', ') || 'none'}`,
  ]
  if (snapshot.synergies.length) lines.push(`Synergies:\n- ${snapshot.synergies.join('\n- ')}`)
  if (snapshot.gaps.length) lines.push(`Gaps:\n- ${snapshot.gaps.join('\n- ')}`)
  return lines.join('\n')
}
