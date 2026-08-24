# Fearprime syntetiske testcases

Disse cases bruges til at validere decision engine uden virkelige patientdata.

## CASE-001 — acquisition bottleneck

- immediate learning: poor
- 24h retention: not interpretable
- sleep: adequate
- major confounder: no

Forventet routing: `F3`.

## CASE-002 — consolidation bottleneck

- immediate learning: high quality
- 24h retention: adequate
- 7d retention: repeatedly poor
- sleep: adequate
- major confounder: low

Forventet routing: `F4`.

## CASE-003 — context generalisation

- same-context retrieval: good
- similar-stimulus retrieval: fair
- new-context retrieval: poor

Forventet routing: `F5`.

## CASE-004 — sleep confound

- immediate learning: good
- 24h retention: poor
- prior-night sleep: markedly poor
- repeated association across events

Forventet routing: søvn/confound-hypotese skal evalueres før F4 pharmacological bottleneck konkluderes.

## CASE-005 — chronic psychiatric state

- acquisition: acceptable
- consolidation: acceptable
- depression/anxiety/hyperarousal/function remain poor over weeks

Forventet routing: `F11`.

## CASE-006 — inflammatory state hypothesis

- repeated inflammatory biomarker elevation documented clinically
- fatigue/physiological symptoms elevated
- PTSD outcomes co-vary over time

Forventet routing: `F12`, men korrelation må ikke fortolkes som kausalitet.

## CASE-007 — safety flag

- marked new paranoia/dissociation/agitation after an intervention

Forventet routing: `SAFETY_REVIEW`; ingen automatisk eskalering eller re-challenge.
