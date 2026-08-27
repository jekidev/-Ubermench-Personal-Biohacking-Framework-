import { scorePhenotype } from "../engine/phenotype";
import { nextBestTest } from "../engine/next-best-test";

const acceptable = { learningQuality: { overall: "acceptable" as const } };
const high = { learningQuality: { overall: "high_quality" as const } };

const acquisition = scorePhenotype([
  { ...acceptable, eventType: "acquisition", threatPre: 80, threatPost: 85, safetyPre: 20, safetyPost: 18 },
  { ...acceptable, eventType: "acquisition", threatPre: 75, threatPost: 82, safetyPre: 25, safetyPost: 20 }
]);

console.assert(acquisition.find((signal) => signal.phenotype === "F3")?.status === "resolved", "F3 synthetic case should not falsely classify as a bottleneck when safety learning is consistently absent but the current metric is not defined as failure.");

const only24h = scorePhenotype([
  {
    ...high,
    eventType: "extinction",
    threatPre: 80,
    threatPost: 20,
    safetyPre: 20,
    safetyPost: 80,
    followUps: [{ timepoint: "24h", sameContext: 70, sleepQuality: 8 }]
  }
]);
console.assert(only24h.find((signal) => signal.phenotype === "F4")?.status === "insufficient_data", "24h alone must not classify F4.");

const poor7d = scorePhenotype([
  {
    ...high,
    eventType: "extinction",
    threatPre: 80,
    threatPost: 20,
    safetyPre: 20,
    safetyPost: 80,
    followUps: [{ timepoint: "7d", sameContext: 35, sleepQuality: 8 }]
  },
  {
    ...high,
    eventType: "extinction",
    threatPre: 85,
    threatPost: 15,
    safetyPre: 15,
    safetyPost: 85,
    followUps: [{ timepoint: "7d", sameContext: 40, sleepQuality: 8 }]
  }
]);
console.assert(poor7d.find((signal) => signal.phenotype === "F4")?.status === "probable", "Repeated poor 7d retention should classify F4 as probable.");

const contextGap = scorePhenotype([
  {
    ...high,
    eventType: "extinction",
    threatPre: 80,
    threatPost: 20,
    safetyPre: 20,
    safetyPost: 80,
    followUps: [
      { timepoint: "7d", sameContext: 90, similarStimulus: 80, newContext: 30 },
      { timepoint: "7d", sameContext: 88, similarStimulus: 78, newContext: 25 }
    ]
  }
]);
console.assert(contextGap.find((signal) => signal.phenotype === "F5")?.status === "probable", "Repeated context gap should classify F5 as probable.");

const relapseSplit = scorePhenotype([
  {
    ...high,
    eventType: "retention_7d",
    followUps: [
      { timepoint: "7d", sameContext: 85, spontaneousRecovery: 1, sleepQuality: 8 },
      { timepoint: "7d", sameContext: 82, renewal: 6, sleepQuality: 8 }
    ]
  }
]);
console.assert(relapseSplit.find((signal) => signal.phenotype === "F6")?.validEvents === 2, "F6 must preserve return-of-fear subtype observations.");

const next = nextBestTest(poor7d, [
  {
    ...high,
    eventType: "extinction",
    threatPre: 80,
    threatPost: 20,
    safetyPre: 20,
    safetyPost: 80,
    followUps: [
      { timepoint: "24h", sameContext: 75 },
      { timepoint: "7d", sameContext: 35, sleepQuality: 8 },
      { timepoint: "7d", sameContext: 40, sleepQuality: 8 }
    ]
  }
]);
console.assert(next.testId === "F4_RETENTION_7D", "Repeated F4 signal should prioritize replication of 7d retention.");
