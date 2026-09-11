export type ChatGptMessage = {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool' | 'unknown'
  text: string
  createTime?: number
}

export type ChatGptConversation = {
  id: string
  title: string
  createTime?: number
  updateTime?: number
  messages: ChatGptMessage[]
}

type RawMessageContent = {
  content_type?: string
  parts?: Array<string | { text?: string }>
}

type RawMappingNode = {
  id?: string
  message?: {
    id?: string
    author?: { role?: string }
    content?: RawMessageContent
    create_time?: number
  } | null
  parent?: string | null
  children?: string[]
}

type RawConversation = {
  id?: string
  title?: string
  create_time?: number
  update_time?: number
  mapping?: Record<string, RawMappingNode>
  current_node?: string
}

function normalizeRole(role?: string): ChatGptMessage['role'] {
  if (role === 'user' || role === 'assistant' || role === 'system' || role === 'tool') return role
  return 'unknown'
}

function extractMessageText(content?: RawMessageContent): string {
  if (!content) return ''
  const parts = content.parts ?? []
  const lines = parts
    .map((part) => {
      if (typeof part === 'string') return part
      if (part && typeof part === 'object' && typeof part.text === 'string') return part.text
      return ''
    })
    .map((line) => line.trim())
    .filter(Boolean)
  return lines.join('\n\n').trim()
}

function walkConversationMessages(mapping: Record<string, RawMappingNode>, currentNodeId?: string): ChatGptMessage[] {
  if (!currentNodeId || !mapping[currentNodeId]) return []

  const path: RawMappingNode[] = []
  let node: RawMappingNode | undefined = mapping[currentNodeId]
  const visited = new Set<string>()

  while (node && !visited.has(node.id ?? '')) {
    visited.add(node.id ?? '')
    path.unshift(node)
    const parentId = node.parent
    node = parentId ? mapping[parentId] : undefined
  }

  const messages: ChatGptMessage[] = []
  for (const item of path) {
    const message = item.message
    if (!message) continue
    const text = extractMessageText(message.content)
    if (!text) continue
    messages.push({
      id: message.id ?? item.id ?? crypto.randomUUID(),
      role: normalizeRole(message.author?.role),
      text,
      createTime: message.create_time,
    })
  }

  return messages
}

export function parseChatGptConversation(raw: RawConversation, index = 0): ChatGptConversation {
  const mapping = raw.mapping ?? {}
  const currentNodeId = raw.current_node ?? Object.keys(mapping).find((id) => !mapping[id]?.children?.length)
  const messages = currentNodeId ? walkConversationMessages(mapping, currentNodeId) : []

  return {
    id: raw.id ?? `conversation-${index + 1}`,
    title: raw.title?.trim() || `Conversation ${index + 1}`,
    createTime: raw.create_time,
    updateTime: raw.update_time,
    messages,
  }
}

export function parseChatGptExportJson(raw: unknown): ChatGptConversation[] {
  const conversations: RawConversation[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { conversations?: RawConversation[] }).conversations)
      ? (raw as { conversations: RawConversation[] }).conversations
      : raw && typeof raw === 'object' && (raw as RawConversation).mapping
        ? [raw as RawConversation]
        : []

  return conversations
    .map((conversation, index) => parseChatGptConversation(conversation, index))
    .filter((conversation) => conversation.messages.length > 0)
}

export function conversationToPlainText(conversation: ChatGptConversation): string {
  const header = [
    `Title: ${conversation.title}`,
    conversation.createTime ? `Created: ${new Date(conversation.createTime * 1000).toISOString()}` : '',
  ].filter(Boolean).join('\n')

  const body = conversation.messages
    .map((message) => `[${message.role}]\n${message.text}`)
    .join('\n\n')

  return `${header}\n\n${body}`.trim()
}
