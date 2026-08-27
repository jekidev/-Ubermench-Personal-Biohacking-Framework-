import type { PhenotypeAssessment } from "../domain/ptsd";
import type { ClinicalStateSnapshot, DailyStateSnapshot, SleepSnapshot, PhysiologicalStateSnapshot } from "../domain/state";

function clamp(value: number): number { return Math.max(0, Math.min(1, value)); }
function mean(values: number[]): number | undefined { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined; }
function make(phenotype: PhenotypeAssessment["phenotype"], status: PhenotypeAssessment["status"], confidence: number, validEvents: number, rationale: string[], signals: string[]): PhenotypeAssessment {
  return { phenotype, status, confidence: clamp(confidence), validEvents, confoundedEvents: 0, rationale, observedSignals: signals, evaluatedAt: new Date().toISOString(), engineVersion: "2.1.0" };
}

export function assessPTSDStatePhenotypes(
  daily: DailyStateSnapshot[],
  sleep: SleepSnapshot[],
  clinical: ClinicalStateSnapshot[],
  physiology: PhysiologicalStateSnapshot[] = []
): PhenotypeAssessment[] {
  const result: PhenotypeAssessment[] = [];

  if (daily.length >= 3) {
    const interoceptive = mean(daily.map((item) => item.interoceptiveThreat));
    const hypervigilance = mean(daily.map((item) => item.hypervigilance));
    const socialThreat = mean(daily.map((item) => item.socialThreat));
    const intrusion = mean(daily.map((item) => item.intrusion));
    const dissociation = mean(daily.map((item) => item.dissociation));

    result.push(make("F7", (interoceptive ?? 0) >= 7 ? "probable" : (interoceptive ?? 0) >= 4 ? "possible" : "resolved", clamp(daily.length / 14), daily.length, ["F7 måler gentagen interoceptive threat separat fra generel fear."], [`Interoceptive threat: ${(interoceptive ?? 0).toFixed(1)}/10`]));
    result.push(make("F8", (hypervigilance ?? 0) >= 7 ? "probable" : (hypervigilance ?? 0) >= 4 ? "possible" : "resolved", clamp(daily.length / 14), daily.length, ["F8 modellerer vedvarende hypervigilance/attention burden som state-variable."], [`Hypervigilance: ${(hypervigilance ?? 0).toFixed(1)}/10`]));
    result.push(make("F10", (intrusion ?? 0) >= 7 ? "probable" : (intrusion ?? 0) >= 4 ? "possible" : "resolved", clamp(daily.length / 14), daily.length, ["F10 måler intrusion burden over tid og holdes adskilt fra session-fear."], [`Intrusion burden: ${(intrusion ?? 0).toFixed(1)}/10`]));
    result.push(make("F13", (socialThreat ?? 0) >= 7 ? "probable" : (socialThreat ?? 0) >= 4 ? "possible" : "resolved", clamp(daily.length / 14), daily.length, ["F13 kræver gentagne sociale threat-observationer; funktion bør bruges som sekundært outcome."], [`Social threat: ${(socialThreat ?? 0).toFixed(1)}/10`]));
    result.push(make("F14", (intrusion ?? 0) >= 6 && (dissociation ?? 0) <= 6 ? "possible" : "insufficient_data", clamp(daily.length / 14), daily.length, ["F14 må ikke inferere reconsolidation. Dedicated imagery/memory-updating events er nødvendige for stærkere klassifikation."], ["Intrusion burden", "Dissociation"]));
  }

  if (sleep.length >= 3) {
    const quality = mean(sleep.map((item) => item.subjectiveQuality ?? 0));
    const nightmares = mean(sleep.map((item) => item.nightmareBurden ?? 0));
    result.push(make("F15", (quality ?? 0) <= 3 || (nightmares ?? 0) >= 7 ? "probable" : (quality ?? 0) <= 5 || (nightmares ?? 0) >= 4 ? "possible" : "resolved", clamp(sleep.length / 14), sleep.length, ["F15 behandler søvn/mareridt som både intervention target og potentiel confounder."], [`Søvnkvalitet: ${(quality ?? 0).toFixed(1)}/10`, `Nightmare burden: ${(nightmares ?? 0).toFixed(1)}/10`]));
  }

  if (clinical.length >= 2) {
    const ordered = [...clinical].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const latest = ordered[ordered.length - 1];
    const previous = ordered[ordered.length - 2];
    const pclDelta = typeof latest.pcl5Total === "number" && typeof previous.pcl5Total === "number" ? latest.pcl5Total - previous.pcl5Total : undefined;
    const functionDelta = typeof latest.function === "number" && typeof previous.function === "number" ? latest.function - previous.function : undefined;
    const confidence = clamp(clinical.length / 4);
    result.push(make("F11", pclDelta === undefined && functionDelta === undefined ? "insufficient_data" : "possible", confidence, clinical.length, ["F11 er et langsigtet clinical-state signal; individuelle ændringer skal vurderes mod gentagne outcomes."], [pclDelta === undefined ? "PCL-5 delta: mangler" : `PCL-5 delta: ${pclDelta.toFixed(1)}`, functionDelta === undefined ? "Funktion delta: mangler" : `Funktion delta: ${functionDelta.toFixed(1)}`]));
  }

  if (physiology.length >= 5) {
    const clean = physiology.filter((item) => !item.artifactFlag && (item.quality ?? 1) >= 0.7);
    const hrv = clean.map((item) => item.hrv).filter((value): value is number => typeof value === "number");
    const hr = clean.map((item) => item.heartRate).filter((value): value is number => typeof value === "number");
    result.push(make("F12", clean.length >= 5 ? "possible" : "insufficient_data", clamp(clean.length / 14), clean.length, ["F12 er et systems-biology signal. Wearable-data alene kan ikke etablere en inflammatorisk sygdom eller kausalitet."], [hrv.length ? `HRV-observationer: ${hrv.length}` : "HRV: mangler", hr.length ? `HR-observationer: ${hr.length}` : "HR: mangler"]));
  }

  if (!result.some((item) => item.phenotype === "F9")) {
    result.push(make("F9", "not_assessed", 0, 0, ["F9 kræver eksplicit safety-rule retrieval test under relevant activation."], []));
  }
  if (!result.some((item) => item.phenotype === "F16")) {
    result.push(make("F16", "not_assessed", 0, 0, ["F16 kræver klinikerleveret neuromodulation event + longitudinel outcome."], []));
  }

  return result;
}
