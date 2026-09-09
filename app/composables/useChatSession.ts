import { createDefaultSkillRegistry } from '~/services/agent-superstack/skills'
import {
  loadChatPreferences,
  saveChatPreferences,
  setShowStackSynergy,
  toggleChatRule,
  toggleChatSkill,
  toggleChatWorkflow,
} from '~/services/chat-session/store'
import { CHAT_RULES } from '~/services/chat-session/rules'
import { CHAT_WORKFLOWS } from '~/services/chat-session/workflows'
import { listSlashCommands, parseSlashCommand } from '~/services/chat-session/slash-commands'
import { buildStackSynergySnapshot, formatStackSynergyContext } from '~/services/chat-session/stack-synergy'
import type { ChatMessage, ChatSessionPreferences } from '~/services/chat-session/types'
import type { AgentTaskKind } from '~/services/agent-superstack/types'

export function useChatSession() {
  const preferences = useState<ChatSessionPreferences>('ubermensch-chat-preferences', () => loadChatPreferences())
  const messages = useState<ChatMessage[]>('ubermensch-chat-messages', () => [])
  const skillRegistry = createDefaultSkillRegistry()

  function refresh() {
    preferences.value = loadChatPreferences()
  }

  function allSkills() {
    return skillRegistry.list()
  }

  function toggleSkill(skillId: string, enabled: boolean) {
    preferences.value = toggleChatSkill(skillId, enabled)
  }

  function toggleRule(ruleId: string, enabled: boolean) {
    preferences.value = toggleChatRule(ruleId, enabled)
  }

  function toggleWorkflow(workflowId: string, enabled: boolean) {
    preferences.value = toggleChatWorkflow(workflowId, enabled)
  }

  function toggleStackSynergy(enabled: boolean) {
    preferences.value = setShowStackSynergy(enabled)
  }

  function resetPreferences() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('ubermensch:chat-session:v1')
    preferences.value = loadChatPreferences()
  }

  function isSkillEnabled(skillId: string) {
    return preferences.value.enabledSkillIds.includes(skillId)
  }

  function isRuleEnabled(ruleId: string) {
    return preferences.value.enabledRuleIds.includes(ruleId)
  }

  function isWorkflowEnabled(workflowId: string) {
    return preferences.value.enabledWorkflowIds.includes(workflowId)
  }

  function slashHelp() {
    return listSlashCommands(preferences.value.enabledWorkflowIds)
  }

  function stackSnapshot() {
    return buildStackSynergySnapshot({
      enabledSkillIds: preferences.value.enabledSkillIds,
      enabledRuleIds: preferences.value.enabledRuleIds,
      enabledWorkflowIds: preferences.value.enabledWorkflowIds,
      showStackSynergy: preferences.value.showStackSynergy,
    })
  }

  function stackSummary() {
    return formatStackSynergyContext(stackSnapshot())
  }

  function parseInput(input: string) {
    return parseSlashCommand(input, preferences.value.enabledWorkflowIds)
  }

  function pushMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>) {
    messages.value.push({
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    })
  }

  function clearMessages() {
    messages.value = []
  }

  function buildAgentTask(input: string, fallbackKind: AgentTaskKind = 'chat') {
    const parsed = parseInput(input)
    return {
      id: `chat_${Date.now()}`,
      kind: parsed.kind ?? fallbackKind,
      prompt: parsed.prompt,
      chatOptions: {
        enabledSkillIds: preferences.value.enabledSkillIds,
        enabledRuleIds: preferences.value.enabledRuleIds,
        enabledWorkflowIds: preferences.value.enabledWorkflowIds,
        showStackSynergy: preferences.value.showStackSynergy,
        workflowId: parsed.workflowId,
      },
      parsed,
    }
  }

  return {
    preferences,
    messages,
    allSkills,
    rules: CHAT_RULES,
    workflows: CHAT_WORKFLOWS,
    refresh,
    toggleSkill,
    toggleRule,
    toggleWorkflow,
    toggleStackSynergy,
    resetPreferences,
    isSkillEnabled,
    isRuleEnabled,
    isWorkflowEnabled,
    slashHelp,
    stackSnapshot,
    stackSummary,
    parseInput,
    pushMessage,
    clearMessages,
    buildAgentTask,
    saveChatPreferences,
  }
}
