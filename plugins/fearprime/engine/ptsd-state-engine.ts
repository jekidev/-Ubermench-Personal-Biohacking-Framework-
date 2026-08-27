import type { PhenotypeAssessment } from "../domain/ptsd";
import type { ClinicalStateSnapshot, DailyStateSnapshot, SleepSnapshot, PhysiologicalStateSnapshot } from "../domain/state";

export interface InflammatorySnapshot {
  timestamp: string;
  hsCrp?: number;
  il6?: number;
  tnfAlpha?: number;
  otherMarker?: number;
  source: "lab" | "import";
  clinicallyInterpreted: boolean;
}

export interface ImageryUpdateObservation {
  timestamp: string;
  targetId: string;
  distressPre: number;
  distressPost: number;
  vividnessPre: number;
  vividnessPost: number;
  meaningChanged?: boolean;
  clinicianGuided: boolean;
}

function clamp(value: number): number { return Math.max(0, Math.min(1, value)); }
function mean(values: number[]): number | undefined { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined; }
function make(phenotype: PhenotypeAssessment["phenotype"], status: PhenotypeAssessment["status"], confidence: number, validEvents: number, rationale: string[], signals: string[]): PhenotypeAssessment {
  return { phenotype, status, confidence: clamp(confidence), validEvents, confoundedEvents: 0, rationale, observedSignals: signals, evaluatedAt: new Date().toISOString(), engineVersion: "2.1.1" };
}

export function assessPTSDStatePhenotypes(
  daily: DailyStateSnapshot[],
  sleep: SleepSnapshot[],
  clinical: ClinicalStateSnapshot[],
  physiology: PhysiologicalStateSnapshot[] = [],
  inflammatory: InflammatorySnapshot[] = [],
  imagery: ImageryUpdateObservation[] = []
): PhenotypeAssessment[] {
  const result: PhenotypeAssessment[] = [];

  if (daily.length >= 3) {
    const interoceptive = mean(daily.map((item) => item.interoceptiveThreat));
    const hypervigilance = mean(daily.map((item) => item.hypervigilance));
    const socialThreat = mean(daily.map((item) => item.socialThreat));
    const intrusion = mean(daily.map((item) => item.intrusion));

    result.push(make("F7", (interoceptive ?? 0) >= 7 ? "probable" : (interoceptive ?? 0) >= 4 ? "possible" : "resolved", clamp(daily.length / 14), daily.length, ["F7 måler gentagen interoceptive threat separat fra generel fear."], [`Interoceptive threat: ${(interoceptive ?? 0).toFixed(1)}/10`]));
    result.push(make("F8", (hypervigilance ?? 0) >= 7 ? "probable" : (hypervigilance ?? 0) >= 4 ? "possible" : "resolved", clamp(daily.length / 14), daily.length, ["F8 modellerer vedvarende hypervigilance/attention burden som state-variable."], [`Hypervigilance: ${(hypervigilance ?? 0).toFixed(1)}/10`]));
    result.push(make("F10", (intrusion ?? 0) >= 7 ? "probable" : (intrusion ?? 0) >= 4 ? "possible" : "resolved", clamp(daily.length / 14), daily.length, ["F10 måler intrusion burden over tid og holdes adskilt fra session-fear."], [`Intrusion burden: ${(intrusion ?? 0).toFixed(1)}/10`]));
    result.push(make("F13", (socialThreat ?? 0) >= 7 ? "probable" : (socialThreat ?? 0) >= 4 ? "possible" : "resolved", clamp(daily.length / 14), daily.length, ["F13 kræver gentagne sociale threat-observationer; funktion bør bruges som sekundært outcome."], [`Social threat: ${(socialThreat ?? 0).toFixed(1)}/10`]));
  }

  if (imagery.length >= 2) {
    const valid = imagery.filter((item) => item.clinicianGuided);
    const improved = valid.filter((item) => item.distressPost < item.distressPre && item.vividnessPost < item.vividnessPre).length;
    const confidence = valid.length >= 2 ? improved / valid.length : 0;
    result.push(make("F14", confidence >= 0.6 ? "possible" : "resolved", clamp(valid.length / 6), valid.length, ["F14 bygger på eksplicitte imagery/memory-updating observationer. Den infererer ikke reconsolidation som biologisk faktum."], [`${improved}/${valid.length} guided imagery observations viser mindre distress og vividness.`]));
  } else {
    result.push(make("F14", "not_assessed", 0, 0, ["F14 kræver dedikerede imagery/memory-updating events; intrusion alene er ikke nok."], []));
  }

  if (sleep.length >= 3) {
    const quality = mean(sleep.map((item) => item.subjectiveQuality ?? 0));
    const nightmares = mean(sleep.map((item) => item.nightmareBurden ?? 0));
    result.push(make("F15", (quality ?? 0) <= 3 || (nightmares ?? 0) >= 7 ? "probable" : (quality ?? 0) <= 5 || (nightmares ?? 0) >= 4 ? "possible" : "resolved", clamp(sleep.length / 14), sleep.length, ["F15 behandler søvn/mareridt som både intervention target og potentiel confounder."], [`Søvnkvalitet: ${(quality ?? 0).toFixed(1)}/10`, `Nightmare burden: ${(nightmares ?? 0).toFixed(1)}/10`]));
  } else {
    result.push(make("F15", "not_assessed", 0, 0, ["Der mangler gentagne søvndata."], []));
  }

  if (clinical.length >= 2) {
    const ordered = [...clinical].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const latest = ordered[ordered.length - 1];
    const previous = ordered[ordered.length - 2];
    const pclDelta = typeof latest.pcl5Total === "number" && typeof previous.pcl5Total === "number" ? latest.pcl5Total - previous.pcl5Total : undefined;
    const functionDelta = typeof latest.function === "number" && typeof previous.function === "number" ? latest.function - previous.function : undefined;
    result.push(make("F11", pclDelta === undefined && functionDelta === undefined ? "insufficient_data" : "possible", clamp(clinical.length / 4), clinical.length, ["F11 er et langsigtet clinical-state signal og kræver gentagne kliniske outcomes."], [pclDelta === undefined ? "PCL-5 delta: mangler" : `PCL-5 delta: ${pclDelta.toFixed(1)}`, functionDelta === undefined ? "Funktion delta: mangler" : `Funktion delta: ${functionDelta.toFixed(1)}`]));
  } else {
    result.push(make("F11", "not_assessed", 0, 0, ["Der mangler mindst to kliniske vurderinger for en trend."], []));
  }

  if (inflammatory.length >= 2 && inflammatory.every((item) => item.clinicallyInterpreted)) {
    const crp = inflammatory.map((item) => item.hsCrp).filter((value): value is number => typeof value === "number");
    result.push(make("F12", "possible", clamp(inflammatory.length / 6), inflammatory.length, ["F12 kræver klinisk fortolkede laboratoriedata; HR/HRV alene bruges ikke til at erklære et inflammatorisk phenotype."], [crp.length ? `hs-CRP observationer: ${crp.length}` : "hs-CRP: mangler"]));
  } else {
    result.push(make("F12", "not_assessed", 0, inflammatory.length, ["Der mangler mindst to klinisk fortolkede inflammatoriske observationer."], []));
  }

  if (physiology.length >= 5) {
    const clean = physiology.filter((item) => !item.artifactFlag && (item.quality ?? 1) >= 0.7);
    result.push(make("F1", clean.length >= 5 ? "possible" : "insufficient_data", clamp(clean.length / 14), clean.length, ["F1 fysiologisk arousal skal behandles som støttedata og ikke som selvstændig PTSD-diagnose."], [`Kvalitetsfiltrerede fysiologiske observationer: ${clean.length}`]));
  }

  result.push(make("F2", "not_assessed", 0, 0, ["F2 kræver dedikeret threat-vs-safety discrimination test; daglige fear ratings er ikke tilstrækkelige."], []));
  result.push(make("F9", "not_assessed", 0, 0, ["F9 kræver eksplicit safety-rule retrieval under aktivering."], []));
  result.push(make("F16", "not_assessed", 0, 0, ["F16 kræver klinikerleveret neuromodulation event og longitudinel outcome."], []));

  return result;
}
