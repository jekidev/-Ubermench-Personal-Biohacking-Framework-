import { CHAT_RULES } from './rules'
import { loadCustomChatRules } from './custom-rules-store'
import type { ChatRule } from './types'

export function listAllChatRules(storage?: Pick<Storage, 'getItem'>): ChatRule[] {
  const custom = loadCustomChatRules(storage).map((rule) => ({ ...rule }))
  const builtIn = CHAT_RULES.map((rule) => ({ ...rule }))
  return [...builtIn, ...custom]
}

export function getChatRuleById(id: string, storage?: Pick<Storage, 'getItem'>): ChatRule | undefined {
  return listAllChatRules(storage).find((rule) => rule.id === id)
}

export function listEnabledChatRules(enabledRuleIds: string[], storage?: Pick<Storage, 'getItem'>): ChatRule[] {
  const all = listAllChatRules(storage)
  return all.filter((rule) => enabledRuleIds.includes(rule.id))
}
