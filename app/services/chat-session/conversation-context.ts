import { searchDocuments } from '../../../plugins/longevity/rag/document-index'
import type { ChatMessage } from './types'

export type ConversationTurn = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function buildConversationHistory(messages: ChatMessage[], limit = 12): ConversationTurn[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-limit)
    .map((message) => ({ role: message.role, content: message.content }))
}

export function formatConversationHistory(messages: ChatMessage[], limit = 12): string {
  const history = buildConversationHistory(messages, limit)
  if (!history.length) return ''
  return history.map((turn) => `${turn.role}: ${turn.content}`).join('\n\n')
}

export function buildRagContextForQuery(query: string, limit = 6): string {
  const hits = searchDocuments(query, limit)
  if (!hits.length) return ''
  return hits
    .map((hit, index) => `RAG excerpt ${index + 1} (${hit.title}, score ${hit.score.toFixed(2)}):\n${hit.content}`)
    .join('\n\n')
}

export function buildChatPrompt(input: {
  userPrompt: string
  messages: ChatMessage[]
  includeRag?: boolean
}): { prompt: string; ragContext: string; conversationHistory: string } {
  const conversationHistory = formatConversationHistory(input.messages)
  const ragContext = input.includeRag ? buildRagContextForQuery(input.userPrompt) : ''
  const sections = [
    conversationHistory ? `Conversation so far:\n${conversationHistory}` : '',
    ragContext ? `Relevant indexed documents:\n${ragContext}` : '',
    `Latest user message:\n${input.userPrompt}`,
  ].filter(Boolean)
  return {
    prompt: sections.join('\n\n'),
    ragContext,
    conversationHistory,
  }
}
