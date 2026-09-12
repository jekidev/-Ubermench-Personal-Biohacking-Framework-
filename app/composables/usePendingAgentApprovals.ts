import {
  pendingAgentToolCalls,
  pendingCatalogAgentToolCalls,
  pendingNativeAgentToolCalls,
  runNeedsApprovalUi,
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
  const waitingApproval = computed(() => (
    runtime.activeRun.value ? runNeedsApprovalUi(runtime.activeRun.value) : false
  ))
  const approvalNotice = computed(() => runtime.approvalNotice.value)
  const queuedApprovalCount = computed(() => Math.max(0, runtime.approvalQueue.value.length - (waitingApproval.value ? 1 : 0)))

  return {
    runtime,
    pendingTools,
    pendingCatalogTools,
    pendingNativeTools,
    displayedRun,
    waitingApproval,
    approvalNotice,
    queuedApprovalCount,
  }
}
