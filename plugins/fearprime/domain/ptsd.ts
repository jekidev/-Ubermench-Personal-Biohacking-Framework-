export type FearPhenotypeId =
  | "F1"
  | "F2"
  | "F3"
  | "F4"
  | "F5"
  | "F6"
  | "F7"
  | "F8"
  | "F9"
  | "F10"
  | "F11"
  | "F12"
  | "F13"
  | "F14"
  | "F15"
  | "F16";

export type ReturnOfFearType = "spontaneous_recovery" | "renewal" | "reinstatement";

export type PTSDLearningEventType =
  | "acquisition"
  | "retrieval"
  | "extinction"
  | "safety_discrimination"
  | "counterconditioning"
  | "imagery_rescripting"
  | "interoceptive"
  | "generalisation_stimulus"
  | "generalisation_context"
  | "retention_24h"
  | "retention_7d"
  | "naturalistic_trigger"
  | "spontaneous_recovery"
  | "renewal"
  | "reinstatement"
  | "neutral_learning_control"
  | "real_world_transfer";

export type PhenotypeStatus =
  | "not_assessed"
  | "insufficient_data"
  | "possible"
  | "probable"
  | "supported"
  | "resolved";

export interface PhenotypeAssessment {
  phenotype: FearPhenotypeId;
  status: PhenotypeStatus;
  confidence: number; // 0–1; uncertainty estimate, not a diagnosis probability.
  validEvents: number;
  confoundedEvents: number;
  rationale: string[];
  observedSignals: string[];
  evaluatedAt: string;
  engineVersion: string;
}

export interface PTSDPhenotypeSnapshot {
  patientId: string;
  assessments: PhenotypeAssessment[];
  dominantHypotheses: Array<{
    phenotype: FearPhenotypeId;
    confidence: number;
  }>;
  generatedAt: string;
  engineVersion: string;
}

export interface OutcomeObservation {
  endpointId: string;
  value?: number;
  category?: string;
  timestamp: string;
  quality: "high" | "medium" | "low";
  confounded: boolean;
}

export interface NextBestTestCandidate {
  testId: string;
  targetPhenotypes: FearPhenotypeId[];
  rationale: string;
  informationValue: number; // deterministic ranking score, not a clinical recommendation.
  requiredData: string[];
  clinicianReviewRequired: boolean;
}
