import {
  pendingAgentToolCalls,
  pendingCatalogAgentToolCalls,
  pendingNativeAgentToolCalls,
  summarizeAgentRunForUi,
} from '~/services/agent-runtime/run-reply'

export function usePendingAgentApprovals() {
  const runtime = useAgentRuntime()
  const pendingTools = computed(() => (
    runtime.activeRun.value ? pendingAgentToolCalls(runtime.activeRun.value) : []
  ))
  const pendingCatalogTools = computed(() => (
    runtime.activeRun.value ? pendingCatalogAgentToolCalls(runtime.activeRun.value) : []
  ))
  const pendingNativeTools = computed(() => (
    runtime.activeRun.value ? pendingNativeAgentToolCalls(runtime.activeRun.value) : []
  ))
  const displayedRun = computed(() => (
    runtime.activeRun.value ? summarizeAgentRunForUi(runtime.activeRun.value) : null
  ))
  const waitingApproval = computed(() => displayedRun.value?.status === 'waiting-approval')

  return {
    runtime,
    pendingTools,
    pendingCatalogTools,
    pendingNativeTools,
    displayedRun,
    waitingApproval,
  }
}
