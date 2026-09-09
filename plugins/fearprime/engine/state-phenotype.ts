import type { PhenotypeAssessment } from "../domain/ptsd";
import type { ClinicalStateSnapshot, DailyStateSnapshot, SleepSnapshot } from "../domain/state";

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function mean(values: number[]): number | undefined {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
}

export function assessStatePhenotypes(
  daily: DailyStateSnapshot[],
  sleep: SleepSnapshot[],
  clinical: ClinicalStateSnapshot[]
): PhenotypeAssessment[] {
  const output: PhenotypeAssessment[] = [];

  if (daily.length >= 3) {
    const hypervigilance = mean(daily.map((item) => item.hypervigilance));
    const interoceptive = mean(daily.map((item) => item.interoceptiveThreat));
    const social = mean(daily.map((item) => item.socialThreat));
    const intrusion = mean(daily.map((item) => item.intrusion));

    output.push({
      phenotype: "F7",
      status: (interoceptive ?? 0) >= 7 ? "probable" : (interoceptive ?? 0) >= 4 ? "possible" : "resolved",
      confidence: clamp(daily.length / 14),
      validEvents: daily.length,
      confoundedEvents: daily.filter((item) => item.confounded).length,
      rationale: ["F7 bygger på gentagne interoceptive-threat ratings og skal holdes adskilt fra generel fear."],
      observedSignals: [`Gennemsnitlig interoceptive threat: ${(interoceptive ?? 0).toFixed(1)}/10`],
      evaluatedAt: new Date().toISOString(),
      engineVersion: "2.0.2"
    });

    output.push({
      phenotype: "F8",
      status: (hypervigilance ?? 0) >= 7 ? "probable" : (hypervigilance ?? 0) >= 4 ? "possible" : "resolved",
      confidence: clamp(daily.length / 14),
      validEvents: daily.length,
      confoundedEvents: daily.filter((item) => item.confounded).length,
      rationale: ["F8 vurderer vedvarende hypervigilance som en state-variabel."],
      observedSignals: [`Gennemsnitlig hypervigilance: ${(hypervigilance ?? 0).toFixed(1)}/10`],
      evaluatedAt: new Date().toISOString(),
      engineVersion: "2.0.2"
    });

    output.push({
      phenotype: "F10",
      status: (intrusion ?? 0) >= 7 ? "probable" : (intrusion ?? 0) >= 4 ? "possible" : "resolved",
      confidence: clamp(daily.length / 14),
      validEvents: daily.length,
      confoundedEvents: daily.filter((item) => item.confounded).length,
      rationale: ["F10 måler intrusion burden over tid; det er ikke det samme som momentær fear under en session."],
      observedSignals: [`Gennemsnitlig intrusion burden: ${(intrusion ?? 0).toFixed(1)}/10`],
      evaluatedAt: new Date().toISOString(),
      engineVersion: "2.0.2"
    });

    output.push({
      phenotype: "F13",
      status: (social ?? 0) >= 7 ? "probable" : (social ?? 0) >= 4 ? "possible" : "resolved",
      confidence: clamp(daily.length / 14),
      validEvents: daily.length,
      confoundedEvents: daily.filter((item) => item.confounded).length,
      rationale: ["F13 kræver gentagne sociale threat/safety-observationer og skal kobles til funktion."],
      observedSignals: [`Gennemsnitlig social threat: ${(social ?? 0).toFixed(1)}/10`],
      evaluatedAt: new Date().toISOString(),
      engineVersion: "2.0.2"
    });
  }

  if (sleep.length >= 3) {
    const quality = mean(sleep.map((item) => item.subjectiveQuality ?? 0));
    const nightmares = mean(sleep.map((item) => item.nightmareBurden ?? 0));
    output.push({
      phenotype: "F15",
      status: (quality ?? 0) <= 3 || (nightmares ?? 0) >= 7 ? "probable" : (quality ?? 0) <= 5 || (nightmares ?? 0) >= 4 ? "possible" : "resolved",
      confidence: clamp(sleep.length / 14),
      validEvents: sleep.length,
      confoundedEvents: 0,
      rationale: ["F15 behandler søvn/mareridt både som klinisk target og potentiel confounder for læring."],
      observedSignals: [`Gennemsnitlig søvnkvalitet: ${(quality ?? 0).toFixed(1)}/10`, `Gennemsnitlig nightmare burden: ${(nightmares ?? 0).toFixed(1)}/10`],
      evaluatedAt: new Date().toISOString(),
      engineVersion: "2.0.2"
    });
  }

  if (clinical.length >= 2) {
    const latest = clinical[clinical.length - 1];
    const prior = clinical[clinical.length - 2];
    const change = typeof latest.pcl5Total === "number" && typeof prior.pcl5Total === "number" ? latest.pcl5Total - prior.pcl5Total : undefined;
    const functionChange = typeof latest.function === "number" && typeof prior.function === "number" ? latest.function - prior.function : undefined;

    output.push({
      phenotype: "F11",
      status: Math.abs(change ?? 0) >= 5 || Math.abs(functionChange ?? 0) >= 2 ? "probable" : "possible",
      confidence: clamp(clinical.length / 4),
      validEvents: clinical.length,
      confoundedEvents: 0,
      rationale: ["F11 er et langsigtet clinical-state signal og kræver gentagne kliniske målinger."],
      observedSignals: [
        change === undefined ? "PCL-5 trend mangler" : `PCL-5 ændring siden forrige vurdering: ${change.toFixed(1)}`,
        functionChange === undefined ? "Funktionsændring mangler" : `Funktionsændring: ${functionChange.toFixed(1)}`
      ],
      evaluatedAt: new Date().toISOString(),
      engineVersion: "2.0.2"
    });
  }

  return output;
}
