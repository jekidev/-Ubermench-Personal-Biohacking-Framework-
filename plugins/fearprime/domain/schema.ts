import type { FearPhenotypeId, PTSDLearningEventType } from "./ptsd";

export type ID = string;

export type ThreatType =
  | "external"
  | "social"
  | "interoceptive"
  | "contextual"
  | "intrusive"
  | "nightmare";

/** Canonical PTSD learning events plus the legacy retention_test alias. */
export type EventType = PTSDLearningEventType | "retention_test";

export type InterventionType =
  | "psychotherapy"
  | "drug"
  | "nutrition"
  | "exercise"
  | "sleep"
  | "biofeedback"
  | "neuromodulation"
  | "digital";

export type EvidenceTier = "E0" | "E1" | "E2" | "E3";
export type QualityState = "pass" | "unclear" | "fail" | "flag";

export interface Patient {
  id: ID;
  timezone: string;
  preferredLanguage: "da" | "en";
  createdAt: string;
  profileVersion: number;
  status: "active" | "archived";
}

export interface ClinicalAssessment {
  id: ID;
  patientId: ID;
  instrument: "PCL5" | "CAPS5" | "PHQ9" | "GAD7" | "ISI" | "OTHER";
  instrumentVersion: string;
  timestamp: string;
  totalScore?: number;
  subscaleScores?: Record<string, number>;
  completedBy: "patient" | "clinician";
  notes?: string;
}

export interface MemoryTarget {
  id: ID;
  patientId: ID;
  label: string;
  threatType: ThreatType;
  triggerClass?: string;
  threatPrediction?: string;
  safetyRule?: string;
  primaryContextId?: ID;
  generalisationClass?: string;
  interoceptiveComponent: number;
  intrusionComponent: number;
  socialComponent: number;
  avoidanceBaseline: number;
  safetyBehaviourBaseline: number;
  memoryStrength?: 1 | 2 | 3 | 4 | 5;
  status:
    | "untested"
    | "active"
    | "learning"
    | "acquired"
    | "retained"
    | "generalised"
    | "stable"
    | "reassess";
  currentBottleneck?: FearPhenotypeId;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Context {
  id: ID;
  patientId: ID;
  name: string;
  type: "home" | "clinic" | "vr" | "work" | "social" | "public" | "naturalistic" | "other";
  similarityToPrimary?: number;
  socialDensity?: number;
  physicalSetting?: string;
  timePattern?: string;
  createdAt: string;
}

export interface Stimulus {
  id: ID;
  memoryId: ID;
  class: "target" | "similar" | "moderately_similar" | "category" | "novel_related" | "interoceptive";
  similarityToTarget: number;
  modality: "visual" | "auditory" | "social" | "imaginal" | "interoceptive" | "real_world" | "vr";
  description?: string;
}

export interface Hypothesis {
  id: ID;
  patientId: ID;
  targetType: FearPhenotypeId;
  statement: string;
  expectedDirection?: "increase" | "decrease" | "none" | "mixed";
  confidence: number;
  supportingEvidenceIds: ID[];
  competingHypothesisIds: ID[];
  status: "open" | "supported" | "weakened" | "rejected" | "uncertain";
  createdAt: string;
  updatedAt: string;
}

export interface Experiment {
  id: ID;
  patientId: ID;
  hypothesisId: ID;
  interventionId?: ID;
  protocolVersion: string;
  baselineStart?: string;
  baselineEnd?: string;
  primaryEndpointId: ID;
  secondaryEndpointIds: ID[];
  predefinedSuccessRule: string;
  predefinedFailureRule: string;
  safetyRule: string;
  status: "draft" | "clinician_review" | "approved" | "active" | "completed" | "invalid" | "stopped";
  clinicianDecisionId?: ID;
  createdAt: string;
}

export interface PredictionLock {
  expectedOutcome: string;
  expectedProbability: number;
  confidence: number;
  lockedAt: string;
  predictionHash: string;
  schemaVersion: string;
}

export interface EventState {
  fear: number;
  threatExpectancy: number;
  safetyExpectancy: number;
  paranoia: number;
  dissociation: number;
  cognitiveClarity: number;
  avoidance?: number;
  safetyBehaviour?: number;
  heartRate?: number;
  hrv?: number;
}

export interface LearningQuality {
  activation: QualityState;
  predictionError: QualityState;
  safetyLearning: QualityState;
  engagement: QualityState;
  stability: QualityState;
  overall: "high_quality" | "acceptable" | "unclear" | "failed" | "safety_flag";
}

export interface LearningEvent {
  id: ID;
  experimentId: ID;
  memoryId: ID;
  stimulusId?: ID;
  contextId?: ID;
  eventType: EventType;
  environment: "home" | "clinic" | "vr" | "real_world";
  timestampStart: string;
  timestampEnd?: string;
  protocolVersion: string;
  prediction?: PredictionLock;
  preState?: EventState;
  postState?: EventState;
  actualOutcome?: string;
  actualOutcomeProbability?: number;
  learningQuality?: LearningQuality;
  dataQuality?: DataQuality;
  status: "draft" | "locked" | "completed" | "invalid" | "safety_review";
}

export interface FollowUp {
  id: ID;
  sourceEventId: ID;
  timepoint: "30m" | "24h" | "7d" | "30d" | "custom";
  timestamp: string;
  fear?: number;
  threatExpectancy?: number;
  safetyExpectancy?: number;
  intrusion?: number;
  avoidance?: number;
  paranoia?: number;
  dissociation?: number;
  function?: number;
  sleepQuality?: number;
  sameContextResponse?: number;
  similarStimulusResponse?: number;
  newContextResponse?: number;
  spontaneousRecovery?: number;
  renewal?: number;
  reinstatement?: number;
  majorStressSinceEvent?: boolean;
  confounded?: boolean;
  correctionOf?: ID;
}

export interface DataQuality {
  predictionCompleteness: number;
  timingIntegrity: number;
  physiologyQuality?: number;
  questionnaireCompleteness: number;
  contextCompleteness: number;
  confoundBurden: number;
  protocolFidelity: number;
  overall: "high" | "medium" | "low";
}

export interface Intervention {
  id: ID;
  name: string;
  type: InterventionType;
  role?: "clinical" | "adjunct" | "chronic_state" | "learning_augmentation" | "systems_biology" | "exploratory";
  mechanism?: string[];
  targetPhases: string[];
  evidenceTier: EvidenceTier;
  ptsdEvidenceTier: "none" | "limited" | "moderate" | "strong" | "very_limited";
  expectedLatency?: string;
  expectedWindow?: string;
  primaryEndpointId?: ID;
  secondaryEndpointIds: ID[];
  safetyEndpointIds: ID[];
  interactionGroupIds: ID[];
  carryoverRisk: "low" | "medium" | "high" | "unknown";
  status: "library" | "considered" | "clinician_review" | "approved" | "active" | "completed" | "deprioritized" | "rejected";
  lastEvidenceReview: string;
  evidenceVersion: string;
}

export interface InterventionEvent {
  id: ID;
  interventionId: ID;
  patientId: ID;
  timestamp: string;
  experimentId?: ID;
  deliveryStatus: "planned" | "delivered" | "missed" | "modified" | "unknown";
  formulation?: string;
  protocolDeviation?: boolean;
  deviationId?: ID;
  clinicianDecisionId?: ID;
}

export interface AdverseEvent {
  id: ID;
  patientId: ID;
  timestamp: string;
  interventionId?: ID;
  description: string;
  severity: "mild" | "moderate" | "severe" | "critical";
  suspectedRelationship: "unlikely" | "possible" | "probable" | "unknown";
  duration?: string;
  resolution?: string;
  clinicianNotified: boolean;
  action: "none" | "monitor" | "hold" | "stop" | "clinical_review";
}

export interface ClinicianDecision {
  id: ID;
  patientId: ID;
  targetType: "intervention" | "experiment" | "session" | "safety";
  targetId: ID;
  decision: "approved" | "conditional" | "deferred" | "rejected";
  rationale?: string;
  clinicianId: ID;
  timestamp: string;
  reviewDate?: string;
}

export interface SleepRecord {
  id: ID;
  patientId: ID;
  date: string;
  durationHours?: number;
  efficiency?: number;
  sleepOnset?: string;
  wakeAfterSleepOnset?: number;
  awakenings?: number;
  nightmares?: number;
  subjectiveQuality?: number;
  restoration?: number;
  source: "manual" | "wearable" | "combined";
  deviceId?: ID;
  quality?: number;
}

export interface PhysiologyRecord {
  id: ID;
  patientId: ID;
  timestamp: string;
  heartRate?: number;
  hrv?: number;
  respiration?: number;
  eda?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  sourceDevice?: string;
  quality?: number;
  artifactFlag?: boolean;
  algorithmVersion?: string;
}

export interface EvidenceRecord {
  id: ID;
  interventionId: ID;
  citation: string;
  publicationDate?: string;
  studyType: "guideline" | "meta_analysis" | "systematic_review" | "RCT" | "controlled" | "open_label" | "mechanistic_human" | "preclinical";
  population?: string;
  sampleSize?: number;
  primaryEndpoint?: string;
  result?: string;
  limitations?: string;
  ptsdSpecific: boolean;
  mechanistic: boolean;
  evidenceTier: EvidenceTier;
  reviewedAt: string;
}

export interface Confounder {
  id: ID;
  patientId: ID;
  timestamp: string;
  type: "sleep_loss" | "acute_stress" | "illness" | "training" | "diet_change" | "medication_change" | "supplement_change" | "travel" | "social_event" | "substance" | "device_change" | "other";
  severity: number;
  start?: string;
  end?: string;
  notes?: string;
}

export interface ProtocolVersion {
  id: ID;
  protocolName: "Fearprime";
  version: string;
  schemaVersion: string;
  algorithmVersion: string;
  evidenceVersion: string;
  releasedAt: string;
  changelog: string[];
}

export interface AuditEvent {
  id: ID;
  patientId?: ID;
  entityType: string;
  entityId: ID;
  action: "create" | "update" | "correct" | "void" | "export" | "sync";
  timestamp: string;
  actorType: "patient" | "clinician" | "system";
  previousHash?: string;
  currentHash?: string;
}
