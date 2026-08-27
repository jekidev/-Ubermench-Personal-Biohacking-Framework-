import type { FearPhenotypeId } from "./ptsd";

export type EndpointKind = "clinical" | "learning" | "physiology" | "sleep" | "safety";

export interface EndpointDefinition {
  id: string;
  name: string;
  kind: EndpointKind;
  phenotype?: FearPhenotypeId;
  description: string;
  requiredData: string[];
  primaryEligible: boolean;
}

export const PTSD_ENDPOINTS: EndpointDefinition[] = [
  { id: "clinical.pcl5.total", name: "PCL-5 samlet score", kind: "clinical", description: "Longitudinelt symptommål for PTSD.", requiredData: ["PCL5"], primaryEligible: true },
  { id: "clinical.function", name: "Daglig funktion", kind: "clinical", description: "Funktionsniveau i hverdagen.", requiredData: ["function"], primaryEligible: true },
  { id: "clinical.intrusion_burden", name: "Intrusionsbyrde", kind: "clinical", phenotype: "F10", description: "Frekvens/intensitet af intrusive memories.", requiredData: ["intrusion"], primaryEligible: true },

  { id: "F3.acquisition", name: "Extinction acquisition", kind: "learning", phenotype: "F3", description: "Kvaliteten af sikkerhedslæring under en læringssession.", requiredData: ["prediction", "preState", "postState"], primaryEligible: true },
  { id: "F4.retention_24h", name: "24-timers retention", kind: "learning", phenotype: "F4", description: "Tidlig delayed retrieval af safety-memory.", requiredData: ["24h follow-up"], primaryEligible: true },
  { id: "F4.retention_7d", name: "7-dages retention", kind: "learning", phenotype: "F4", description: "Langtidsretrieval af extinction-memory.", requiredData: ["7d follow-up"], primaryEligible: true },
  { id: "F5.stimulus_generalisation", name: "Stimulusgeneralisering", kind: "learning", phenotype: "F5", description: "Transfer fra target-stimulus til relaterede stimuli.", requiredData: ["similar-stimulus response"], primaryEligible: true },
  { id: "F5.context_transfer", name: "Konteksto­verførsel", kind: "learning", phenotype: "F5", description: "Transfer af safety-memory til ny kontekst.", requiredData: ["new-context response"], primaryEligible: true },
  { id: "F6.spontaneous_recovery", name: "Spontaneous recovery", kind: "learning", phenotype: "F6", description: "Return-of-fear efter tidsinterval uden ny aversiv hændelse.", requiredData: ["delayed retrieval"], primaryEligible: true },
  { id: "F6.renewal", name: "Renewal", kind: "learning", phenotype: "F6", description: "Return-of-fear ved kontekstskifte.", requiredData: ["context shift"], primaryEligible: true },
  { id: "F6.reinstatement", name: "Reinstatement", kind: "learning", phenotype: "F6", description: "Return-of-fear efter en naturlig/klinisk relevant stressor.", requiredData: ["stressor", "post-stressor response"], primaryEligible: true },
  { id: "F7.interoceptive_threat", name: "Interoceptiv threat", kind: "learning", phenotype: "F7", description: "Trusselstolkning af kropslige sensationer.", requiredData: ["interoceptive cue", "threat expectancy"], primaryEligible: true },
  { id: "F8.hypervigilance", name: "Hypervigilance", kind: "clinical", phenotype: "F8", description: "Vedvarende threat-monitorering/attention burden.", requiredData: ["hypervigilance"], primaryEligible: true },
  { id: "F9.safety_rule_retrieval", name: "Safety-rule retrieval", kind: "learning", phenotype: "F9", description: "Adgang til eksplicit safety knowledge under threat.", requiredData: ["safety expectancy", "threat context"], primaryEligible: true },
  { id: "F11.chronic_state", name: "Kronisk psychiatric state", kind: "clinical", phenotype: "F11", description: "Langsigtet mood/anxiety/hyperarousal/function.", requiredData: ["weekly clinical state"], primaryEligible: true },
  { id: "F12.inflammatory_state", name: "Inflammatorisk/vascular state", kind: "physiology", phenotype: "F12", description: "Biologisk state skal vurderes sammen med kliniske outcomes.", requiredData: ["clinically indicated biomarkers", "clinical state"], primaryEligible: true },
  { id: "F13.social_safety", name: "Social safety discrimination", kind: "learning", phenotype: "F13", description: "Threat/safety discrimination i sociale situationer.", requiredData: ["social cue", "safety expectancy", "function"], primaryEligible: true },
  { id: "F14.imagery_update", name: "Imagery/memory updating", kind: "learning", phenotype: "F14", description: "Intrusive imagery og betydningsopdatering uden at antage reconsolidation.", requiredData: ["imagery target", "post-update outcome"], primaryEligible: true },
  { id: "F15.sleep_nightmares", name: "Søvn/mareridt", kind: "sleep", phenotype: "F15", description: "Søvnkontinuitet, nightmares og next-day state.", requiredData: ["sleep record"], primaryEligible: true },
  { id: "F16.network_state", name: "Neuromodulation/network state", kind: "clinical", phenotype: "F16", description: "Klinikerleveret neuromodulation med longitudinel outcome tracking.", requiredData: ["intervention event", "clinical outcome"], primaryEligible: true }
];

export function getEndpoint(id: string): EndpointDefinition | undefined {
  return PTSD_ENDPOINTS.find((endpoint) => endpoint.id === id);
}
