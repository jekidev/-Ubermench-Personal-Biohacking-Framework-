import { Store } from "@tauri-apps/plugin-store";
import { z } from "zod";

const PredictionSchema = z.object({
  expectedOutcome: z.string().min(1),
  expectedProbability: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  lockedAt: z.string(),
  predictionHash: z.string(),
  schemaVersion: z.string()
});

const MemoryTargetSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  threatPrediction: z.string().optional(),
  safetyRule: z.string().optional(),
  createdAt: z.string(),
  status: z.enum(["untested", "active", "learning", "retained", "generalised", "stable", "reassess"])
});

const EventSchema = z.object({
  id: z.string(),
  type: z.enum(["memory_target", "prediction_lock", "learning_event", "follow_up", "daily_state"]),
  timestamp: z.string(),
  payload: z.record(z.string(), z.unknown()),
  schemaVersion: z.string()
});

export type MemoryTarget = z.infer<typeof MemoryTargetSchema>;
export type FearprimeEvent = z.infer<typeof EventSchema>;
export type Prediction = z.infer<typeof PredictionSchema>;

const EVENTS_KEY = "events";
const MEMORY_KEY = "memoryTargets";
const DB_NAME = "fearprime.store.json";

function browserGet<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function browserSet<T>(key: string, value: T) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function useFearprimeStore() {
  const isTauri = computed(() => Boolean(window?.__TAURI_INTERNALS__));

  async function loadEvents(): Promise<FearprimeEvent[]> {
    if (!isTauri.value) return browserGet<FearprimeEvent[]>(EVENTS_KEY, []);
    const store = await Store.load(DB_NAME);
    return (await store.get<FearprimeEvent[]>(EVENTS_KEY)) ?? [];
  }

  async function saveEvents(events: FearprimeEvent[]) {
    if (!isTauri.value) {
      browserSet(EVENTS_KEY, events);
      return;
    }
    const store = await Store.load(DB_NAME);
    await store.set(EVENTS_KEY, events);
    await store.save();
  }

  async function appendEvent(event: FearprimeEvent) {
    const parsed = EventSchema.parse(event);
    const events = await loadEvents();
    await saveEvents([...events, parsed]);
    return parsed;
  }

  async function listMemoryTargets(): Promise<MemoryTarget[]> {
    if (!isTauri.value) return browserGet<MemoryTarget[]>(MEMORY_KEY, []);
    const store = await Store.load(DB_NAME);
    return (await store.get<MemoryTarget[]>(MEMORY_KEY)) ?? [];
  }

  async function createMemoryTarget(input: Omit<MemoryTarget, "id" | "createdAt">) {
    const target = MemoryTargetSchema.parse({
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    });

    const targets = await listMemoryTargets();
    const next = [...targets, target];

    if (!isTauri.value) {
      browserSet(MEMORY_KEY, next);
    } else {
      const store = await Store.load(DB_NAME);
      await store.set(MEMORY_KEY, next);
      await store.save();
    }

    await appendEvent({
      id: crypto.randomUUID(),
      type: "memory_target",
      timestamp: target.createdAt,
      payload: target,
      schemaVersion: "1.1"
    });

    return target;
  }

  async function lockPrediction(input: Omit<Prediction, "lockedAt" | "predictionHash" | "schemaVersion">) {
    const lockedAt = new Date().toISOString();
    const canonical = JSON.stringify({ ...input, lockedAt });
    const bytes = new TextEncoder().encode(canonical);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const predictionHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");

    const prediction = PredictionSchema.parse({
      ...input,
      lockedAt,
      predictionHash,
      schemaVersion: "1.1"
    });

    await appendEvent({
      id: crypto.randomUUID(),
      type: "prediction_lock",
      timestamp: lockedAt,
      payload: prediction,
      schemaVersion: "1.1"
    });

    return prediction;
  }

  return {
    loadEvents,
    appendEvent,
    listMemoryTargets,
    createMemoryTarget,
    lockPrediction
  };
}
