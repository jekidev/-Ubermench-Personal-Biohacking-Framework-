import type { CanonicalObservation } from '~/types/personal-state'
import type { LifestyleKind, LifestyleLog, SleepLog, WorkoutLog } from '~/types/lifestyle'
import {
  emptyLifestyleLogStore,
  loadLifestyleLogStore,
  mergeSleepIntoBiology,
  mergeWorkoutIntoBiology,
  removeLifestyleLog,
  saveLifestyleLogStore,
  selectLifestyleLogs,
  upsertLifestyleLog,
  type LifestyleLogStore,
} from '~/services/lifestyle-log-store'
import { selectSleepObservations, selectWorkoutObservations } from '~/services/lifestyle-observations'
import { emptyPersonalStateStore, loadPersonalStateStore } from '~/services/personal-state-store'

export function useLifestyleLogs() {
  const biology = usePersonalBiology()
  const store = useState<LifestyleLogStore>('lifestyle-log-store', () => emptyLifestyleLogStore())
  const initialized = useState<boolean>('lifestyle-log-initialized', () => false)
  const observations = useState<CanonicalObservation[]>('lifestyle-personal-observations', () => [])

  function persist(next: LifestyleLogStore) {
    store.value = next
    if (import.meta.client) saveLifestyleLogStore(localStorage, next)
  }

  function initialize(options?: { reload?: boolean }) {
    if (!import.meta.client) return
    if (initialized.value && !options?.reload) return
    store.value = loadLifestyleLogStore(localStorage)
    observations.value = loadPersonalStateStore(localStorage).observations
    initialized.value = true
  }

  onMounted(() => {
    initialize({ reload: true })
  })

  function refreshObservations() {
    if (!import.meta.client) {
      observations.value = []
      return
    }
    observations.value = loadPersonalStateStore(localStorage).observations
  }

  function logsOf(kind: LifestyleKind): LifestyleLog[] {
    return selectLifestyleLogs(store.value, kind)
  }

  async function addLog(log: LifestyleLog) {
    persist(upsertLifestyleLog(store.value, log))
    await biology.initialize()
    if (log.kind === 'sleep') {
      await biology.persist({
        ...biology.profile.value,
        sleep: mergeSleepIntoBiology(biology.profile.value.sleep, log),
      })
    }
    if (log.kind === 'workout') {
      await biology.persist({
        ...biology.profile.value,
        training: mergeWorkoutIntoBiology(biology.profile.value.training, log),
      })
    }
  }

  async function removeLog(id: string) {
    const existing = store.value.logs.find((item) => item.id === id)
    persist(removeLifestyleLog(store.value, id))
    if (!existing || (existing.kind !== 'sleep' && existing.kind !== 'workout')) return
    await biology.initialize()
    if (existing.kind === 'sleep') {
      await biology.persist({
        ...biology.profile.value,
        sleep: biology.profile.value.sleep.filter((item) => item.id !== id),
      })
    } else {
      await biology.persist({
        ...biology.profile.value,
        training: biology.profile.value.training.filter((item) => item.id !== id),
      })
    }
  }

  const sleepLogs = computed(() => logsOf('sleep') as SleepLog[])
  const workoutLogs = computed(() => logsOf('workout') as WorkoutLog[])
  const mealLogs = computed(() => logsOf('meal'))
  const meditationLogs = computed(() => logsOf('meditation'))
  const garminSleep = computed(() => selectSleepObservations(observations.value))
  const garminWorkouts = computed(() => selectWorkoutObservations(observations.value))

  return {
    store,
    initialized,
    initialize,
    refreshObservations,
    addLog,
    removeLog,
    logsOf,
    sleepLogs,
    workoutLogs,
    mealLogs,
    meditationLogs,
    garminSleep,
    garminWorkouts,
    emptyStore: emptyLifestyleLogStore,
    emptyObservations: emptyPersonalStateStore,
  }
}
