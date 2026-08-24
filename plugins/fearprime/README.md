# Fearprime

Fearprime er et modul/plugin til Ubermench Personal Biohacking Framework til struktureret PTSD-, fear-learning-, memory- og interventionstracking.

## Formål

Fearprime er et måle-, forsknings- og beslutningsstøttelag. Det er ikke en autonom ordinationsmotor.

Kerneprincip:

`klinisk state → phenotype → bottleneck → hypotese → intervention → primært endpoint → follow-up → attribution → model update`

## Scope

- PTSD-symptomtracking og kliniske outcomes
- fear learning / extinction / safety discrimination
- consolidation, retrieval, generalisation og relapse
- intrusive memories, søvn, interoception og hypervigilance
- intervention registry for psykoterapi, lægemidler, søvn, motion, biofeedback og neuromodulation
- N-of-1 og intraindividuel analyse
- evidence registry
- adverse-event og interaction metadata
- clinician export
- offline-first mobil/webarkitektur

## Aktiv farmakologisk researchliste

- Moclobemide — F11 chronic psychiatric state
- Memantine — F3 acquisition/cognition
- Sodium butyrate — F4 consolidation research
- L-DOPA — F4–F6 conditional research
- Pentoxifylline — F12 inflammatory/vascular state
- Oxytocin — F2/F3/F10/F13 conditional research
- D-cycloserine — F3/F4 clinician-led research
- Prazosin — F15/nightmare phenotype

Standard klinisk referenceklasse:

- Sertraline
- Paroxetine
- Venlafaxine

## Eksplicit fjernet fra aktiv protokol

- Kanna/Sceletium
- Selegiline
- BNC210

De kan fortsat ligge i en separat research library, men må ikke blive behandlingsforslag i aktiv decision engine uden eksplicit re-review.

## Designprincipper

1. Kliniske outcomes har højere prioritet end biometriske signaler.
2. Acquisition, consolidation, retrieval, generalisation og relapse analyseres separat.
3. Interventioner kobles til specifikke hypoteser og primære endpoints.
4. Rådata ændres ikke af analyser; derived metrics beregnes separat.
5. Prediction locks er immutable efter session-start.
6. Safety flags kan blokere videre eksperimentel analyse og kræve clinician review.
7. Systemet skal holde competing hypotheses i stedet for at tvinge én forklaring.
8. Wearables er supplerende data, ikke selvstændig PTSD-diagnostik.
9. Eksperimentelle compounds må ikke præsenteres som etablerede PTSD-behandlinger.
10. Historiske data skal være reproducerbare gennem protocol-, schema- og evidence-versionering.

## Struktur

- `domain/` — domænemodeller og enums
- `protocols/` — state machine og beslutningsregler
- `interventions/` — intervention registry
- `evidence/` — evidensramme og researchnoter
- `analytics/` — planlagt analysearkitektur
- `tests/` — planlagte syntetiske testcases
