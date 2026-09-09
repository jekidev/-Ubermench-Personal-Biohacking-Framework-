import type { ChatMessage } from './types'

export type ChatConversation = {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export type ConversationStore = {
  schemaVersion: 1
  activeConversationId: string
  conversations: ChatConversation[]
}

const STORAGE_KEY = 'ubermensch:chat-conversations:v1'
const MAX_CONVERSATIONS = 20
const MAX_MESSAGES_PER_CONVERSATION = 100

function newConversation(title = 'New chat'): ChatConversation {
  const now = new Date().toISOString()
  return {
    id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function emptyConversationStore(): ConversationStore {
  const conversation = newConversation()
  return { schemaVersion: 1, activeConversationId: conversation.id, conversations: [conversation] }
}

export function loadConversationStore(storage: Pick<Storage, 'getItem'> = localStorage): ConversationStore {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyConversationStore()
    const parsed = JSON.parse(raw) as ConversationStore
    if (parsed.schemaVersion !== 1 || !parsed.conversations.length) return emptyConversationStore()
    return parsed
  } catch {
    return emptyConversationStore()
  }
}

export function saveConversationStore(
  store: ConversationStore,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getActiveConversation(store: ConversationStore): ChatConversation {
  return store.conversations.find((conversation) => conversation.id === store.activeConversationId)
    ?? store.conversations[0]
    ?? newConversation()
}

export function appendConversationMessage(
  message: ChatMessage,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): ConversationStore {
  let store = loadConversationStore(storage)
  const active = getActiveConversation(store)
  const title = active.messages.length === 0 && message.role === 'user'
    ? message.content.slice(0, 48)
    : active.title
  const messages = [...active.messages, message].slice(-MAX_MESSAGES_PER_CONVERSATION)
  const updatedConversation: ChatConversation = {
    ...active,
    title,
    messages,
    updatedAt: new Date().toISOString(),
  }
  store = {
    ...store,
    conversations: store.conversations.map((conversation) =>
      conversation.id === active.id ? updatedConversation : conversation,
    ),
  }
  saveConversationStore(store, storage)
  return store
}

export function clearActiveConversation(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): ConversationStore {
  let store = loadConversationStore(storage)
  const active = getActiveConversation(store)
  const cleared = { ...active, messages: [], updatedAt: new Date().toISOString() }
  store = {
    ...store,
    conversations: store.conversations.map((conversation) =>
      conversation.id === active.id ? cleared : conversation,
    ),
  }
  saveConversationStore(store, storage)
  return store
}

export function createConversation(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): ConversationStore {
  let store = loadConversationStore(storage)
  const conversation = newConversation()
  store = {
    ...store,
    activeConversationId: conversation.id,
    conversations: [conversation, ...store.conversations].slice(0, MAX_CONVERSATIONS),
  }
  saveConversationStore(store, storage)
  return store
}
