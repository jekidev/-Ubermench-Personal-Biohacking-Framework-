import type { PhenotypeAssessment } from "../domain/ptsd";

export interface DiscriminationObservation {
  threatResponse: number;
  safetyResponse: number;
  context: "same" | "different";
  valid: boolean;
}

export interface SafetyRuleObservation {
  threatActive: boolean;
  safetyRuleCorrect: boolean;
  responseConfidence: number;
  valid: boolean;
}

function clamp(value: number): number { return Math.max(0, Math.min(1, value)); }

export function assessF2ThreatSafetyDiscrimination(observations: DiscriminationObservation[]): PhenotypeAssessment {
  const valid = observations.filter((item) => item.valid);
  if (valid.length < 3) {
    return {
      phenotype: "F2",
      status: "insufficient_data",
      confidence: 0,
      validEvents: valid.length,
      confoundedEvents: 0,
      rationale: ["F2 kræver gentagne, eksplicitte threat-vs-safety discrimination observationer."],
      observedSignals: [],
      evaluatedAt: new Date().toISOString(),
      engineVersion: "2.1.0"
    };
  }

  const gaps = valid.map((item) => item.threatResponse - item.safetyResponse);
  const meanGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const weakDiscrimination = gaps.filter((gap) => gap < 20).length;
  const confidence = clamp(weakDiscrimination / gaps.length);

  return {
    phenotype: "F2",
    status: confidence >= 0.6 ? "probable" : confidence >= 0.3 ? "possible" : "resolved",
    confidence,
    validEvents: valid.length,
    confoundedEvents: 0,
    rationale: ["Lav threat-vs-safety gap er et signal om mulig diskriminationsvanskelighed; 20-point grænsen er en intern analysemarkør, ikke en klinisk cut-off."],
    observedSignals: [`Gennemsnitlig threat-safety gap: ${meanGap.toFixed(1)}.`],
    evaluatedAt: new Date().toISOString(),
    engineVersion: "2.1.0"
  };
}

export function assessF9SafetyRuleRetrieval(observations: SafetyRuleObservation[]): PhenotypeAssessment {
  const valid = observations.filter((item) => item.valid);
  if (valid.length < 3) {
    return {
      phenotype: "F9",
      status: "insufficient_data",
      confidence: 0,
      validEvents: valid.length,
      confoundedEvents: 0,
      rationale: ["F9 kræver gentagne safety-rule retrieval tests under relevant activation."],
      observedSignals: [],
      evaluatedAt: new Date().toISOString(),
      engineVersion: "2.1.0"
    };
  }

  const correct = valid.filter((item) => item.threatActive && item.safetyRuleCorrect).length;
  const activated = valid.filter((item) => item.threatActive).length;
  const retrievalRate = activated ? correct / activated : 0;
  const confidence = activated >= 3 ? clamp(1 - retrievalRate) : 0;

  return {
    phenotype: "F9",
    status: activated < 3 ? "insufficient_data" : confidence >= 0.6 ? "probable" : confidence >= 0.3 ? "possible" : "resolved",
    confidence,
    validEvents: valid.length,
    confoundedEvents: 0,
    rationale: ["F9 skelner eksplicit safety-viden fra faktisk retrieval under activation."],
    observedSignals: [`Korrekt safety-rule retrieval under activation: ${(retrievalRate * 100).toFixed(1)}%.`],
    evaluatedAt: new Date().toISOString(),
    engineVersion: "2.1.0"
  };
}
