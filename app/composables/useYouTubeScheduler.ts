import {
  addYouTubeScheduleSource,
  isYouTubeSchedulerDue,
  loadYouTubeSchedulerStore,
  removeYouTubeScheduleSource,
  runYouTubeScheduler,
  saveYouTubeSchedulerStore,
  type YouTubeScheduleSource,
  type YouTubeSchedulerStore,
} from '../../plugins/connectors/youtube-scheduler'

export function useYouTubeScheduler() {
  const store = useState<YouTubeSchedulerStore>('ubermensch-youtube-scheduler', () => loadYouTubeSchedulerStore())
  const running = ref(false)
  const lastResult = ref('')

  function refresh() {
    store.value = loadYouTubeSchedulerStore()
  }

  function save(next: YouTubeSchedulerStore) {
    saveYouTubeSchedulerStore(next)
    store.value = next
  }

  function setEnabled(enabled: boolean) {
    save({ ...store.value, enabled })
  }

  function setIntervalHours(hours: number) {
    save({ ...store.value, intervalHours: Math.max(1, hours) })
  }

  function addSource(input: Omit<YouTubeScheduleSource, 'id'>) {
    store.value = addYouTubeScheduleSource(input)
  }

  function removeSource(sourceId: string) {
    store.value = removeYouTubeScheduleSource(sourceId)
  }

  async function runNow(force = true) {
    running.value = true
    try {
      const result = await runYouTubeScheduler({ force })
      store.value = result.store
      lastResult.value = result.store.lastRunSummary ?? `Indexed ${result.indexed}, skipped ${result.skipped}.`
      return result
    } finally {
      running.value = false
    }
  }

  async function tickIfDue() {
    if (!isYouTubeSchedulerDue(store.value)) return null
    return runNow(false)
  }

  return {
    store,
    running,
    lastResult,
    refresh,
    setEnabled,
    setIntervalHours,
    addSource,
    removeSource,
    runNow,
    tickIfDue,
    isDue: computed(() => isYouTubeSchedulerDue(store.value)),
  }
}
