import { CHAT_WORKFLOWS, findWorkflowBySlash } from './workflows'
import type { SlashCommandResult } from './types'

export function listSlashCommands(enabledWorkflowIds: string[]): string[] {
  return CHAT_WORKFLOWS
    .filter((workflow) => enabledWorkflowIds.includes(workflow.id))
    .map((workflow) => `${workflow.slash} — ${workflow.description}`)
}

export function parseSlashCommand(input: string, enabledWorkflowIds: string[]): SlashCommandResult {
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) {
    return { prompt: trimmed, handled: false }
  }

  const workflow = findWorkflowBySlash(trimmed)
  if (!workflow || !enabledWorkflowIds.includes(workflow.id)) {
    return {
      prompt: trimmed,
      handled: true,
      message: `Unknown or disabled command. Try ${listSlashCommands(enabledWorkflowIds).join(' · ')}`,
    }
  }

  const args = trimmed.slice(workflow.slash.length).trim()

  if (workflow.id === 'help') {
    return {
      prompt: 'List available slash commands, chat toggles, and how the active stack components work together.',
      workflowId: workflow.id,
      kind: workflow.kind,
      handled: true,
      message: listSlashCommands(enabledWorkflowIds).join('\n'),
    }
  }

  if (workflow.id === 'stack') {
    return {
      prompt: args || 'Explain stack synergies and interaction risks for my current biohacking setup.',
      workflowId: workflow.id,
      kind: workflow.kind,
      handled: true,
    }
  }

  if (workflow.id === 'youtube-rag') {
    return {
      prompt: args
        ? `Index these YouTube URLs into local RAG, then summarize key biohacking takeaways:\n${args}`
        : 'Explain how to use /youtube with podcast URLs and what gets indexed into RAG.',
      workflowId: workflow.id,
      kind: workflow.kind,
      handled: true,
    }
  }

  if (workflow.id === 'youtube-schedule') {
    return {
      prompt: args || 'Run the YouTube scheduler and report what was indexed into RAG.',
      workflowId: workflow.id,
      kind: workflow.kind,
      handled: true,
    }
  }

  if (workflow.id === 'drive-rag') {
    return {
      prompt: args
        ? `Sync Drive PDFs to RAG. Folder hint: ${args}`
        : 'Sync new Google Drive PDFs into local RAG and report what was indexed.',
      workflowId: workflow.id,
      kind: workflow.kind,
      handled: true,
    }
  }

  if (workflow.id === 'research') {
    return {
      prompt: args || 'Run an evidence-oriented literature review for my current biohacking question.',
      workflowId: workflow.id,
      kind: workflow.kind,
      handled: true,
    }
  }

  return {
    prompt: args || trimmed,
    workflowId: workflow.id,
    kind: workflow.kind,
    handled: true,
  }
}
