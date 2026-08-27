import { Store } from "@tauri-apps/plugin-store";
import { z } from "zod";

const PredictionSchema = z.object({ expectedOutcome: z.string().min(1), expectedProbability: z.number().min(0).max(100), confidence: z.number().min(0).max(100), lockedAt: z.string(), predictionHash: z.string(), schemaVersion: z.string() });
const MemoryTargetSchema = z.object({ id: z.string(), label: z.string().min(1), threatPrediction: z.string().optional(), safetyRule: z.string().optional(), createdAt: z.string(), status: z.enum(["untested", "active", "learning", "acquired", "retained", "generalised", "stable", "reassess"]) });
const EventSchema = z.object({ id: z.string(), type: z.enum(["memory_target", "prediction_lock", "learning_event", "follow_up", "daily_state", "clinical_assessment", "sleep_record", "physiology", "adverse_event", "intrusion_event"]), timestamp: z.string(), payload: z.record(z.string(), z.unknown()), schemaVersion: z.string() });

const LearningInputSchema = z.object({
  memoryId: z.string().min(1),
  eventType: z.enum(["acquisition", "retrieval", "extinction", "safety_discrimination", "counterconditioning", "imagery_rescripting", "interoceptive", "generalisation_stimulus", "generalisation_context", "retention_24h", "retention_7d", "naturalistic_trigger", "spontaneous_recovery", "renewal", "reinstatement", "neutral_learning_control", "real_world_transfer"]),
  context: z.string().optional(),
  stimulus: z.string().optional(),
  fearPre: z.number().min(0).max(10),
  threatPre: z.number().min(0).max(100),
  safetyPre: z.number().min(0).max(100),
  fearPost: z.number().min(0).max(10),
  threatPost: z.number().min(0).max(100),
  safetyPost: z.number().min(0).max(100),
  actualOutcome: z.enum(["threat_occurred", "threat_absent", "ambiguous", "not_applicable"]),
  actualOutcomeProbability: z.number().min(0).max(100).optional()
});

const FollowUpInputSchema = z.object({
  followUpId: z.string().min(1), timepoint: z.enum(["24h", "7d", "30d", "custom"]),
  fear: z.number().min(0).max(10), threatExpectancy: z.number().min(0).max(100), safetyExpectancy: z.number().min(0).max(100), intrusion: z.number().min(0).max(10), sleepQuality: z.number().min(0).max(10),
  sameContextResponse: z.number().min(0).max(100), similarStimulusResponse: z.number().min(0).max(100).optional(), newContextResponse: z.number().min(0).max(100),
  spontaneousRecovery: z.number().min(0).max(10).optional(), renewal: z.number().min(0).max(10).optional(), reinstatement: z.number().min(0).max(10).optional(), confounded: z.boolean().optional()
});

const ClinicalInputSchema = z.object({ instrument: z.enum(["PCL5", "CAPS5", "PHQ9", "GAD7", "ISI"]), totalScore: z.number().min(0), instrumentVersion: z.string().default("unspecified"), completedBy: z.enum(["patient", "clinician"]).default("patient"), source: z.enum(["manual", "import"]).default("manual") });

export type MemoryTarget = z.infer<typeof MemoryTargetSchema>;
export type FearprimeEvent = z.infer<typeof EventSchema>;
export type Prediction = z.infer<typeof PredictionSchema>;
export type LearningInput = z.infer<typeof LearningInputSchema>;
export type FollowUpInput = z.infer<typeof FollowUpInputSchema>;
export type ClinicalInput = z.infer<typeof ClinicalInputSchema>;

const EVENTS_KEY = "events";
const MEMORY_KEY = "memoryTargets";
const DB_NAME = "fearprime.store.json";
const SCHEMA_VERSION = "2.0.0";

function browserGet<T>(key: string, fallback: T): T { if (typeof localStorage === "undefined") return fallback; try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function browserSet<T>(key: string, value: T) { if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(value)); }
async function getStore() { return Store.load(DB_NAME); }

export function useFearprimeStore() {
  const isTauri = computed(() => import.meta.client && Boolean(window.__TAURI_INTERNALS__));

  async function loadEvents(): Promise<FearprimeEvent[]> { if (!isTauri.value) return browserGet<FearprimeEvent[]>(EVENTS_KEY, []); const store = await getStore(); return (await store.get<FearprimeEvent[]>(EVENTS_KEY)) ?? []; }
  async function saveEvents(events: FearprimeEvent[]) { if (!isTauri.value) { browserSet(EVENTS_KEY, events); return; } const store = await getStore(); await store.set(EVENTS_KEY, events); await store.save(); }
  async function appendEvent(event: FearprimeEvent) { const parsed = EventSchema.parse(event); const events = await loadEvents(); await saveEvents([...events, parsed]); return parsed; }

  async function listMemoryTargets(): Promise<MemoryTarget[]> { if (!isTauri.value) return browserGet<MemoryTarget[]>(MEMORY_KEY, []); const store = await getStore(); return (await store.get<MemoryTarget[]>(MEMORY_KEY)) ?? []; }

  async function createMemoryTarget(input: Omit<MemoryTarget, "id" | "createdAt">) {
    const target = MemoryTargetSchema.parse({ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    const targets = await listMemoryTargets();
    if (!isTauri.value) browserSet(MEMORY_KEY, [...targets, target]); else { const store = await getStore(); await store.set(MEMORY_KEY, [...targets, target]); await store.save(); }
    await appendEvent({ id: crypto.randomUUID(), type: "memory_target", timestamp: target.createdAt, payload: target, schemaVersion: SCHEMA_VERSION });
    return target;
  }

  async function lockPrediction(input: Omit<Prediction, "lockedAt" | "predictionHash" | "schemaVersion">) {
    const lockedAt = new Date().toISOString();
    const canonical = JSON.stringify({ ...input, lockedAt });
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
    const predictionHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const prediction = PredictionSchema.parse({ ...input, lockedAt, predictionHash, schemaVersion: SCHEMA_VERSION });
    await appendEvent({ id: crypto.randomUUID(), type: "prediction_lock", timestamp: lockedAt, payload: prediction, schemaVersion: SCHEMA_VERSION });
    return prediction;
  }

  async function createLearningEvent(input: LearningInput, prediction: Prediction) {
    const parsed = LearningInputSchema.parse(input);
    const validatedPrediction = PredictionSchema.parse(prediction);
    const timestamp = new Date().toISOString();
    const threatChange = parsed.threatPost - parsed.threatPre;
    const safetyGain = parsed.safetyPost - parsed.safetyPre;
    const actualProbability = parsed.actualOutcomeProbability ?? (parsed.actualOutcome === "threat_occurred" ? 100 : parsed.actualOutcome === "threat_absent" ? 0 : undefined);
    const predictionError = actualProbability === undefined ? undefined : Math.abs(validatedPrediction.expectedProbability - actualProbability);
    const learningQuality = { activation: "pass", predictionError: predictionError === undefined ? "unclear" : predictionError >= 20 ? "pass" : "unclear", safetyLearning: safetyGain > 0 ? "pass" : "unclear", engagement: "pass", stability: "pass", overall: predictionError !== undefined && predictionError >= 20 && safetyGain > 0 ? "high_quality" : "acceptable" } as const;
    const saved = await appendEvent({ id: crypto.randomUUID(), type: "learning_event", timestamp, payload: { ...parsed, prediction: validatedPrediction, derived: { threatChange, safetyGain, predictionError }, learningQuality }, schemaVersion: SCHEMA_VERSION });
    await appendEvent({ id: crypto.randomUUID(), type: "follow_up", timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), payload: { sourceEventId: saved.id, timepoint: "24h", status: "pending" }, schemaVersion: SCHEMA_VERSION });
    await appendEvent({ id: crypto.randomUUID(), type: "follow_up", timestamp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), payload: { sourceEventId: saved.id, timepoint: "7d", status: "pending" }, schemaVersion: SCHEMA_VERSION });
    return saved;
  }

  async function listPendingFollowUps() {
    const events = await loadEvents();
    const completedIds = new Set(events.filter((event) => event.type === "follow_up" && (event.payload as Record<string, unknown>).status === "completed" && typeof (event.payload as Record<string, unknown>).followUpId === "string").map((event) => String((event.payload as Record<string, unknown>).followUpId)));
    return events.filter((event) => event.type === "follow_up").map((event) => ({ id: event.id, timestamp: event.timestamp, ...(event.payload as Record<string, unknown>) })).filter((followUp) => followUp.status === "pending" && !completedIds.has(String(followUp.id))).sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  }

  async function completeFollowUp(input: FollowUpInput) {
    const parsed = FollowUpInputSchema.parse(input);
    const events = await loadEvents();
    const source = events.find((event) => event.id === parsed.followUpId);
    await appendEvent({ id: crypto.randomUUID(), type: "follow_up", timestamp: new Date().toISOString(), payload: { ...parsed, sourceEventId: source?.payload && "sourceEventId" in source.payload ? source.payload.sourceEventId : undefined, followUpId: parsed.followUpId, status: "completed" }, schemaVersion: SCHEMA_VERSION });
    return parsed;
  }

  async function saveClinicalAssessment(input: ClinicalInput) {
    const parsed = ClinicalInputSchema.parse(input);
    return appendEvent({ id: crypto.randomUUID(), type: "clinical_assessment", timestamp: new Date().toISOString(), payload: parsed, schemaVersion: SCHEMA_VERSION });
  }

  return { loadEvents, appendEvent, listMemoryTargets, createMemoryTarget, lockPrediction, createLearningEvent, listPendingFollowUps, completeFollowUp, saveClinicalAssessment };
}
