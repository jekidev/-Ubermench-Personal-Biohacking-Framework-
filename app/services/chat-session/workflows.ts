import type { ChatWorkflow } from './types'

export const CHAT_WORKFLOWS: ChatWorkflow[] = [
  {
    id: 'research',
    name: 'Research workflow',
    description: 'Europe PMC literature search with normalized evidence records.',
    slash: '/research',
    kind: 'research',
    enabled: true,
    synergy: ['paper-search', 'scientific-literature-search', 'evidence-grade'],
  },
  {
    id: 'biohacking',
    name: 'Biohacking analysis',
    description: 'Personal biology context with biomarkers, variants, and safety screening.',
    slash: '/biohack',
    kind: 'biohacking',
    enabled: true,
    synergy: ['bio-research', 'safety-conservative', 'stack-synergy'],
  },
  {
    id: 'stack',
    name: 'Stack synergy',
    description: 'Map interactions between supplements, protocols, connectors, and data sources.',
    slash: '/stack',
    kind: 'biohacking',
    enabled: true,
    synergy: ['stack-synergy', 'bio-research'],
  },
  {
    id: 'youtube-rag',
    name: 'YouTube → RAG',
    description: 'Index podcast transcripts from pasted YouTube URLs into local RAG.',
    slash: '/youtube',
    kind: 'automation',
    enabled: true,
    requiresConnector: 'youtube-rag',
    synergy: ['youtube-rag', 'transcriptor', 'bio-research'],
  },
  {
    id: 'drive-rag',
    name: 'Drive → RAG',
    description: 'Sync Google Drive PDFs into the local document index.',
    slash: '/drive-sync',
    kind: 'automation',
    enabled: true,
    requiresConnector: 'google-drive',
    synergy: ['google-drive', 'paper-qa'],
  },
  {
    id: 'youtube-schedule',
    name: 'YouTube scheduler',
    description: 'Run scheduled playlist/channel/subscription sync into RAG.',
    slash: '/youtube-sync',
    kind: 'automation',
    enabled: true,
    requiresConnector: 'youtube-rag',
    synergy: ['youtube-rag', 'transcriptor'],
  },
  {
    id: 'help',
    name: 'Chat help',
    description: 'List slash commands, toggles, and active stack components.',
    slash: '/help',
    kind: 'chat',
    enabled: true,
  },
]

export function getChatWorkflow(id: string): ChatWorkflow | undefined {
  return CHAT_WORKFLOWS.find((workflow) => workflow.id === id)
}

export function findWorkflowBySlash(input: string): ChatWorkflow | undefined {
  const token = input.trim().split(/\s+/)[0]?.toLowerCase()
  return CHAT_WORKFLOWS.find((workflow) => workflow.slash === token)
}
