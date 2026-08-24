import { Store } from "@tauri-apps/plugin-store";
import { z } from "zod";

const PredictionSchema = z.object({ expectedOutcome: z.string().min(1), expectedProbability: z.number().min(0).max(100), confidence: z.number().min(0).max(100), lockedAt: z.string(), predictionHash: z.string(), schemaVersion: z.string() });
const MemoryTargetSchema = z.object({ id: z.string(), label: z.string().min(1), threatPrediction: z.string().optional(), safetyRule: z.string().optional(), createdAt: z.string(), status: z.enum(["untested", "active", "learning", "retained", "generalised", "stable", "reassess"]) });
const EventSchema = z.object({ id: z.string(), type: z.enum(["memory_target", "prediction_lock", "learning_event", "follow_up", "daily_state"]), timestamp: z.string(), payload: z.record(z.string(), z.unknown()), schemaVersion: z.string() });
const LearningInputSchema = z.object({ memoryId: z.string().min(1), eventType: z.enum(["retrieval", "extinction", "safety_discrimination", "counterconditioning", "imagery_rescripting", "interoceptive", "generalisation", "retention_test", "naturalistic_trigger"]), context: z.string().optional(), stimulus: z.string().optional(), fearPre: z.number().min(0).max(10), threatPre: z.number().min(0).max(100), safetyPre: z.number().min(0).max(100), fearPost: z.number().min(0).max(10), threatPost: z.number().min(0).max(100), safetyPost: z.number().min(0).max(100), actualOutcome: z.string().min(1), expectedProbability: z.number().min(0).max(100) });
const FollowUpInputSchema = z.object({ followUpId: z.string().min(1), timepoint: z.enum(["24h", "7d", "30d", "custom"]), fear: z.number().min(0).max(10), threatExpectancy: z.number().min(0).max(100), safetyExpectancy: z.number().min(0).max(100), intrusion: z.number().min(0).max(10), sleepQuality: z.number().min(0).max(10), sameContextResponse: z.number().min(0).max(100), newContextResponse: z.number().min(0).max(100) });

export type MemoryTarget = z.infer<typeof MemoryTargetSchema>;
export type FearprimeEvent = z.infer<typeof EventSchema>;
export type Prediction = z.infer<typeof PredictionSchema>;
export type LearningInput = z.infer<typeof LearningInputSchema>;
export type FollowUpInput = z.infer<typeof FollowUpInputSchema>;

const EVENTS_KEY = "events";
const MEMORY_KEY = "memoryTargets";
const DB_NAME = "fearprime.store.json";

function browserGet<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function browserSet<T>(key: string, value: T) { if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(value)); }
async function getStore() { return Store.load(DB_NAME); }

export function useFearprimeStore() {
  const isTauri = computed(() => import.meta.client && Boolean(window.__TAURI_INTERNALS__));

  async function loadEvents(): Promise<FearprimeEvent[]> {
    if (!isTauri.value) return browserGet<FearprimeEvent[]>(EVENTS_KEY, []);
    const store = await getStore();
    return (await store.get<FearprimeEvent[]>(EVENTS_KEY)) ?? [];
  }
  async function saveEvents(events: FearprimeEvent[]) {
    if (!isTauri.value) { browserSet(EVENTS_KEY, events); return; }
    const store = await getStore(); await store.set(EVENTS_KEY, events); await store.save();
  }
  async function appendEvent(event: FearprimeEvent) { const parsed = EventSchema.parse(event); const events = await loadEvents(); await saveEvents([...events, parsed]); return parsed; }
  async function listMemoryTargets(): Promise<MemoryTarget[]> {
    if (!isTauri.value) return browserGet<MemoryTarget[]>(MEMORY_KEY, []);
    const store = await getStore(); return (await store.get<MemoryTarget[]>(MEMORY_KEY)) ?? [];
  }
  async function createMemoryTarget(input: Omit<MemoryTarget, "id" | "createdAt">) {
    const target = MemoryTargetSchema.parse({ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    const targets = await listMemoryTargets();
    if (!isTauri.value) browserSet(MEMORY_KEY, [...targets, target]);
    else { const store = await getStore(); await store.set(MEMORY_KEY, [...targets, target]); await store.save(); }
    await appendEvent({ id: crypto.randomUUID(), type: "memory_target", timestamp: target.createdAt, payload: target, schemaVersion: "1.1" });
    return target;
  }
  async function lockPrediction(input: Omit<Prediction, "lockedAt" | "predictionHash" | "schemaVersion">) {
    const lockedAt = new Date().toISOString();
    const bytes = new TextEncoder().encode(JSON.stringify({ ...input, lockedAt }));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const predictionHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const prediction = PredictionSchema.parse({ ...input, lockedAt, predictionHash, schemaVersion: "1.1" });
    await appendEvent({ id: crypto.randomUUID(), type: "prediction_lock", timestamp: lockedAt, payload: prediction, schemaVersion: "1.1" });
    return prediction;
  }
  async function createLearningEvent(input: LearningInput) {
    const parsed = LearningInputSchema.parse(input);
    const timestamp = new Date().toISOString();
    const threatChange = parsed.threatPost - parsed.threatPre;
    const safetyGain = parsed.safetyPost - parsed.safetyPre;
    const actualOutcomeProbability = parsed.actualOutcome.trim().toLowerCase() === "ja" ? 100 : 0;
    const predictionError = Math.abs(parsed.expectedProbability - actualOutcomeProbability);
    const learningQuality = { activation: "pass", predictionError: predictionError >= 20 ? "pass" : "unclear", safetyLearning: safetyGain > 0 ? "pass" : "unclear", engagement: "pass", stability: "pass", overall: predictionError >= 20 && safetyGain > 0 ? "high_quality" : "acceptable" };
    const saved = await appendEvent({ id: crypto.randomUUID(), type: "learning_event", timestamp, payload: { ...parsed, derived: { threatChange, safetyGain, predictionError }, learningQuality }, schemaVersion: "1.1" });
    await appendEvent({ id: crypto.randomUUID(), type: "follow_up", timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), payload: { sourceEventId: saved.id, timepoint: "24h", status: "pending" }, schemaVersion: "1.1" });
    await appendEvent({ id: crypto.randomUUID(), type: "follow_up", timestamp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), payload: { sourceEventId: saved.id, timepoint: "7d", status: "pending" }, schemaVersion: "1.1" });
    return saved;
  }
  async function listPendingFollowUps() {
    const events = await loadEvents();
    return events.filter((event) => event.type === "follow_up").map((event) => ({ id: event.id, timestamp: event.timestamp, ...(event.payload as Record<string, unknown>) })).filter((followUp) => followUp.status === "pending").sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  }
  async function completeFollowUp(input: FollowUpInput) {
    const parsed = FollowUpInputSchema.parse(input);
    const source = (await loadEvents()).find((event) => event.id === parsed.followUpId);
    await appendEvent({ id: crypto.randomUUID(), type: "follow_up", timestamp: new Date().toISOString(), payload: { ...parsed, sourceEventId: source?.payload && "sourceEventId" in source.payload ? source.payload.sourceEventId : undefined, status: "completed" }, schemaVersion: "1.1" });
    return parsed;
  }
  return { loadEvents, appendEvent, listMemoryTargets, createMemoryTarget, lockPrediction, createLearningEvent, listPendingFollowUps, completeFollowUp };
}
