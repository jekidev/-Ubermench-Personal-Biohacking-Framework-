# Fearprime Decision Engine v0.1

## Princip

Fearprime is a measurement and research-support engine. It does not autonomously prescribe, dose, escalate, combine, or stop medication.

## Decision order

1. Clinical state
2. Data quality
3. Current phenotype/bottleneck hypothesis
4. Competing hypotheses
5. Best discriminating test
6. Clinician-reviewed intervention, where applicable
7. Predefined primary endpoint
8. Follow-up and replication
9. Attribution

## Phenotype routing

- F1 acute fear/arousal: assess learning compatibility, not sedation target.
- F2 threat/safety discrimination: test threat-vs-safety discrimination and context cues.
- F3 acquisition: assess prediction error, engagement, and safety-learning during acquisition.
- F4 consolidation: prioritize delayed retention testing when immediate learning is adequate.
- F5 generalisation: compare same-context, similar-stimulus, and new-context retrieval.
- F6 relapse: separate spontaneous recovery, renewal, and reinstatement.
- F7 interoception: separate bodily sensation from threat appraisal.
- F8 hypervigilance/attention: track attention and arousal as possible upstream variables.
- F9 executive safety retrieval: test whether explicit safety knowledge is accessible under threat.
- F10 intrusion: track frequency, vividness, happening-now quality, and recovery.
- F11 chronic psychiatric state: longitudinal clinical outcomes over weeks/months.
- F12 inflammatory/vascular state: require biological and clinical endpoints together.
- F13 social safety: test interpersonal threat/safety discrimination and function.
- F14 imagery/memory updating: separate intrusive imagery/meaning problems from classic extinction.
- F15 sleep/nightmares: model sleep as both intervention target and confounder.
- F16 neuromodulation/network state: clinician-delivered intervention with longitudinal outcome tracking.

## Hard rules

- No experiment without a predefined primary endpoint.
- Do not change the primary endpoint after seeing results.
- Preserve raw observations; derived metrics are reproducible calculations.
- Do not infer causality from temporal precedence alone.
- Wearable data are supporting evidence, not standalone PTSD diagnosis.
- New severe or destabilizing symptoms route to clinician review.
