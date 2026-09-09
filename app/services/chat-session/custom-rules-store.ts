import type { ChatRule } from './types'

const STORAGE_KEY = 'ubermensch:chat-custom-rules:v1'

export type CustomChatRule = ChatRule & {
  custom: true
  createdAt: string
}

export function loadCustomChatRules(storage: Pick<Storage, 'getItem'> = localStorage): CustomChatRule[] {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CustomChatRule[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCustomChatRules(
  rules: CustomChatRule[],
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(rules))
}

export function addCustomChatRule(
  input: { name: string; description: string; prompt: string; category?: ChatRule['category'] },
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): CustomChatRule[] {
  const rules = loadCustomChatRules(storage)
  const rule: CustomChatRule = {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    description: input.description.trim(),
    prompt: input.prompt.trim(),
    category: input.category ?? 'style',
    enabled: true,
    custom: true,
    createdAt: new Date().toISOString(),
  }
  const next = [...rules, rule]
  saveCustomChatRules(next, storage)
  return next
}

export function removeCustomChatRule(
  ruleId: string,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): CustomChatRule[] {
  const next = loadCustomChatRules(storage).filter((rule) => rule.id !== ruleId)
  saveCustomChatRules(next, storage)
  return next
}

export function updateCustomChatRule(
  ruleId: string,
  patch: Partial<Pick<ChatRule, 'name' | 'description' | 'prompt' | 'category' | 'enabled'>>,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): CustomChatRule[] {
  const next = loadCustomChatRules(storage).map((rule) =>
    rule.id === ruleId ? { ...rule, ...patch } : rule,
  )
  saveCustomChatRules(next, storage)
  return next
}
