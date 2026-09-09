import { createDefaultSkillRegistry } from '~/services/agent-superstack/skills'
import {
  loadChatPreferences,
  saveChatPreferences,
  setIncludeRagContext,
  setShowStackSynergy,
  toggleChatRule,
  toggleChatSkill,
  toggleChatWorkflow,
} from '~/services/chat-session/store'
import { CHAT_WORKFLOWS } from '~/services/chat-session/workflows'
import { listAllChatRules } from '~/services/chat-session/rule-registry'
import {
  addCustomChatRule,
  loadCustomChatRules,
  removeCustomChatRule,
} from '~/services/chat-session/custom-rules-store'
import { listSlashCommands, parseSlashCommand } from '~/services/chat-session/slash-commands'
import { buildStackSynergySnapshot, formatStackSynergyContext } from '~/services/chat-session/stack-synergy'
import { buildChatPrompt } from '~/services/chat-session/conversation-context'
import {
  appendConversationMessage,
  clearActiveConversation,
  createConversation,
  getActiveConversation,
  loadConversationStore,
} from '~/services/chat-session/conversation-store'
import type { ChatMessage, ChatSessionPreferences } from '~/services/chat-session/types'
import type { AgentTaskKind } from '~/services/agent-superstack/types'

export function useChatSession() {
  const preferences = useState<ChatSessionPreferences>('ubermensch-chat-preferences', () => loadChatPreferences())
  const conversationStore = useState('ubermensch-chat-conversation-store', () => loadConversationStore())
  const skillRegistry = createDefaultSkillRegistry()

  const messages = computed(() => getActiveConversation(conversationStore.value).messages)

  function refresh() {
    preferences.value = loadChatPreferences()
    conversationStore.value = loadConversationStore()
  }

  function allSkills() {
    return skillRegistry.list()
  }

  function allRules() {
    return listAllChatRules()
  }

  function customRules() {
    return loadCustomChatRules()
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

  function toggleRagContext(enabled: boolean) {
    preferences.value = setIncludeRagContext(enabled)
  }

  function resetPreferences() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('ubermensch:chat-session:v1')
    preferences.value = loadChatPreferences()
  }

  function addRule(input: { name: string; description: string; prompt: string }) {
    const created = addCustomChatRule(input)
    const latest = created.at(-1)
    if (latest) preferences.value = toggleChatRule(latest.id, true)
    return created
  }

  function removeRule(ruleId: string) {
    removeCustomChatRule(ruleId)
    refresh()
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
    const full: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    }
    conversationStore.value = appendConversationMessage(full)
    return full
  }

  function clearMessages() {
    conversationStore.value = clearActiveConversation()
  }

  function startNewConversation() {
    conversationStore.value = createConversation()
  }

  function buildAgentTask(input: string, fallbackKind: AgentTaskKind = 'chat') {
    const parsed = parseInput(input)
    const chatBundle = buildChatPrompt({
      userPrompt: parsed.prompt,
      messages: messages.value,
      includeRag: preferences.value.includeRagContext,
    })
    return {
      id: `chat_${Date.now()}`,
      kind: parsed.kind ?? fallbackKind,
      prompt: chatBundle.prompt,
      chatOptions: {
        enabledSkillIds: preferences.value.enabledSkillIds,
        enabledRuleIds: preferences.value.enabledRuleIds,
        enabledWorkflowIds: preferences.value.enabledWorkflowIds,
        showStackSynergy: preferences.value.showStackSynergy,
        includeRagContext: preferences.value.includeRagContext,
        workflowId: parsed.workflowId,
        conversationHistory: chatBundle.conversationHistory,
        ragContext: chatBundle.ragContext,
      },
      parsed,
    }
  }

  return {
    preferences,
    messages,
    conversationStore,
    allSkills,
    allRules,
    customRules,
    workflows: CHAT_WORKFLOWS,
    refresh,
    toggleSkill,
    toggleRule,
    toggleWorkflow,
    toggleStackSynergy,
    toggleRagContext,
    resetPreferences,
    addRule,
    removeRule,
    isSkillEnabled,
    isRuleEnabled,
    isWorkflowEnabled,
    slashHelp,
    stackSnapshot,
    stackSummary,
    parseInput,
    pushMessage,
    clearMessages,
    startNewConversation,
    buildAgentTask,
    saveChatPreferences,
  }
}
