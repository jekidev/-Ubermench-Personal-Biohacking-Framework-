export type SafetySeverity = "info" | "watch" | "urgent" | "critical";

export type SafetySignal =
  | "new_severe_agitation"
  | "new_psychotic_like_symptoms"
  | "marked_dissociation"
  | "suicidal_thoughts"
  | "suicidal_intent_or_plan"
  | "severe_adverse_reaction"
  | "severe_sleep_disruption"
  | "significant_cognitive_change"
  | "other_clinical_concern";

export interface SafetyAssessment {
  signal: SafetySignal;
  severity: SafetySeverity;
  detectedAt: string;
  source: "self_report" | "clinician" | "sensor" | "system";
  interventionId?: string;
  note?: string;
  requiresClinicianReview: boolean;
  experimentAction: "continue_monitoring" | "pause_research_flow" | "urgent_human_review";
}

export function classifySafetySignal(signal: SafetySignal): SafetyAssessment {
  const critical = signal === "suicidal_intent_or_plan" || signal === "severe_adverse_reaction";
  const urgent = critical || signal === "suicidal_thoughts" || signal === "new_psychotic_like_symptoms" || signal === "new_severe_agitation";

  return {
    signal,
    severity: critical ? "critical" : urgent ? "urgent" : "watch",
    detectedAt: new Date().toISOString(),
    source: "system",
    requiresClinicianReview: true,
    experimentAction: critical || urgent ? "urgent_human_review" : "pause_research_flow"
  };
}
