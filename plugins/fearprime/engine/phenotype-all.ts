import type { FearPhenotypeId, PhenotypeAssessment } from "../domain/ptsd";
import { scorePhenotype, type LearningEventForPhenotype } from "./phenotype";

const ALL_PHENOTYPES: FearPhenotypeId[] = [
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8",
  "F9", "F10", "F11", "F12", "F13", "F14", "F15", "F16"
];

const DESCRIPTIONS: Record<FearPhenotypeId, string> = {
  F1: "Akut fear/arousal",
  F2: "Threat/safety discrimination",
  F3: "Extinction acquisition",
  F4: "Consolidation",
  F5: "Stimulus/context generalisation",
  F6: "Return-of-fear",
  F7: "Interoceptiv threat",
  F8: "Hypervigilance/attention",
  F9: "Safety-rule retrieval",
  F10: "Intrusive memory",
  F11: "Chronic psychiatric state",
  F12: "Inflammatory/vascular state",
  F13: "Social safety",
  F14: "Imagery/memory updating",
  F15: "Sleep/nightmares",
  F16: "Neuromodulation/network state"
};

export function scoreAllPhenotypes(events: LearningEventForPhenotype[]): PhenotypeAssessment[] {
  const measured = new Map(scorePhenotype(events).map((signal) => [signal.phenotype, signal]));

  return ALL_PHENOTYPES.map((phenotype) => {
    const existing = measured.get(phenotype);
    if (existing) return existing;

    return {
      phenotype,
      status: "not_assessed",
      confidence: 0,
      validEvents: 0,
      confoundedEvents: 0,
      rationale: [`${DESCRIPTIONS[phenotype]} har endnu ingen dedikeret phenotype-motor i v2.0.`],
      observedSignals: [],
      evaluatedAt: new Date().toISOString(),
      engineVersion: "2.0.0"
    };
  });
}

export { ALL_PHENOTYPES, DESCRIPTIONS };
