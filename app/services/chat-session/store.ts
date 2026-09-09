import { createDefaultSkillRegistry } from '~/services/agent-superstack/skills'
import { CHAT_RULES } from './rules'
import { CHAT_WORKFLOWS } from './workflows'
import type { ChatSessionPreferences } from './types'

const STORAGE_KEY = 'ubermensch:chat-session:v1'

function defaultPreferences(): ChatSessionPreferences {
  const skills = createDefaultSkillRegistry().list()
  return {
    schemaVersion: 1,
    enabledSkillIds: skills.map((skill) => skill.id),
    enabledRuleIds: CHAT_RULES.filter((rule) => rule.enabled).map((rule) => rule.id),
    enabledWorkflowIds: CHAT_WORKFLOWS.filter((workflow) => workflow.enabled).map((workflow) => workflow.id),
    showStackSynergy: true,
  }
}

export function loadChatPreferences(storage: Pick<Storage, 'getItem'> = localStorage): ChatSessionPreferences {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return defaultPreferences()
    const parsed = JSON.parse(raw) as Partial<ChatSessionPreferences>
    if (parsed.schemaVersion !== 1) return defaultPreferences()
    return { ...defaultPreferences(), ...parsed }
  } catch {
    return defaultPreferences()
  }
}

export function saveChatPreferences(
  preferences: ChatSessionPreferences,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}

export function toggleChatSkill(
  skillId: string,
  enabled: boolean,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): ChatSessionPreferences {
  const preferences = loadChatPreferences(storage)
  const set = new Set(preferences.enabledSkillIds)
  if (enabled) set.add(skillId)
  else set.delete(skillId)
  const next = { ...preferences, enabledSkillIds: [...set] }
  saveChatPreferences(next, storage)
  return next
}

export function toggleChatRule(
  ruleId: string,
  enabled: boolean,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): ChatSessionPreferences {
  const preferences = loadChatPreferences(storage)
  const set = new Set(preferences.enabledRuleIds)
  if (enabled) set.add(ruleId)
  else set.delete(ruleId)
  const next = { ...preferences, enabledRuleIds: [...set] }
  saveChatPreferences(next, storage)
  return next
}

export function toggleChatWorkflow(
  workflowId: string,
  enabled: boolean,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): ChatSessionPreferences {
  const preferences = loadChatPreferences(storage)
  const set = new Set(preferences.enabledWorkflowIds)
  if (enabled) set.add(workflowId)
  else set.delete(workflowId)
  const next = { ...preferences, enabledWorkflowIds: [...set] }
  saveChatPreferences(next, storage)
  return next
}

export function setShowStackSynergy(
  show: boolean,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): ChatSessionPreferences {
  const next = { ...loadChatPreferences(storage), showStackSynergy: show }
  saveChatPreferences(next, storage)
  return next
}
