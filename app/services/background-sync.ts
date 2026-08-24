export type SyncAdapter = () => Promise<number>

export interface SyncTask {
  id: string
  intervalMs: number
  nextRunAt: number
  run: SyncAdapter
}

export interface SyncResult {
  id: string
  runAt: string
  synced: number
  error?: string
}

export class BackgroundSyncScheduler {
  private readonly tasks = new Map<string, SyncTask>()
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()

  register(id: string, intervalMs: number, run: SyncAdapter, now = Date.now()) {
    if (!id.trim() || !Number.isFinite(intervalMs) || intervalMs <= 0) throw new Error('Invalid sync task.')
    this.cancel(id)
    const task: SyncTask = { id, intervalMs, nextRunAt: now + intervalMs, run }
    this.tasks.set(id, task)
    this.schedule(task)
    return task
  }

  cancel(id: string) {
    const timer = this.timers.get(id)
    if (timer) clearTimeout(timer)
    this.timers.delete(id)
    this.tasks.delete(id)
  }

  clear() {
    for (const id of this.tasks.keys()) this.cancel(id)
  }

  private schedule(task: SyncTask) {
    const delay = Math.max(0, task.nextRunAt - Date.now())
    const timer = setTimeout(async () => {
      try { await task.run() } catch { /* scheduler is resilient; consumers inspect their own sync state */ }
      task.nextRunAt = Date.now() + task.intervalMs
      this.schedule(task)
    }, delay)
    this.timers.set(task.id, timer)
  }
}

export async function runSyncTask(id: string, run: SyncAdapter): Promise<SyncResult> {
  const runAt = new Date().toISOString()
  try {
    const synced = await run()
    return { id, runAt, synced }
  } catch (error) {
    return { id, runAt, synced: 0, error: error instanceof Error ? error.message : String(error) }
  }
}
