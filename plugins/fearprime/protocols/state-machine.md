# Fearprime state machine v1.0

## Overordnet flow

`clinical baseline → phenotype → competing hypotheses → test → intervention → primary endpoint → follow-up → attribution → model update`

## Klinisk state

- `BASELINE`
- `PHENOTYPE_ASSESSMENT`
- `CLINICIAN_REVIEW`
- `ACTIVE_MONITORING`

## Memory / learning state

- `MEMORY_TARGET`
- `RETRIEVAL`
- `PREDICTION_LOCK`
- `LEARNING`
- `LEARNING_QUALITY_GATE`
- `CONSOLIDATION_WINDOW`
- `RETENTION_24H`
- `RETENTION_7D`
- `STIMULUS_GENERALISATION`
- `CONTEXT_TRANSFER`
- `NATURALISTIC_TRANSFER`
- `RELAPSE_MONITORING`
- `INTRUSION_MONITORING`

## Beslutningsregler

### Learning-quality gate

Et learning event kan kun tælle som validt, hvis:

1. relevant memory er identificeret/aktiveret;
2. prediction er registreret før eventet;
3. faktisk outcome kan vurderes;
4. prediction-error kan fortolkes;
5. engagement er tilstrækkeligt;
6. der ikke er en alvorlig destabiliserende sikkerhedshændelse.

Målinger med utilstrækkelig kvalitet bevares, men markeres `UNCLEAR`, `FAILED` eller `SAFETY_FLAG` frem for at blive slettet.

### F3 — acquisition

Hvis immediate learning er utilstrækkelig, undersøges først protocol fidelity, prediction-error og confounders. Først derefter vurderes en F3 learning-augmentation hypotese.

Relevante research candidates: memantine, D-cycloserine.

### F4 — consolidation

Hvis acquisition er god, men delayed retention gentagne gange er dårlig, undersøges først sleep/stress/carry-over. Derefter kan consolidation candidates vurderes.

Relevante research candidates: sodium butyrate, L-DOPA, glucocorticoid research.

### F5 — generalisation

Hvis samme-context retention er god, men stimulus- eller context-transfer er dårlig, er F5 en bedre hypotese end generel “extinction failure”.

### F6 — relapse

Hold `spontaneous recovery`, `renewal` og `reinstatement` adskilt. Naturalistic stressors må registreres, men skal ikke fremprovokeres af systemet.

### F11 — chronic psychiatric state

Moclobemide og guideline-understøttede antidepressiva analyseres på uger/måneder, ikke som single-session extinction enhancers.

### F12 — inflammatory/vascular state

Pentoxifylline ligger i et separat longitudinalt systems-biology spor. Biomarkørændringer og kliniske outcomes skal måles separat.

## Safety state machine

`NORMAL → WATCH → FLAG → CLINICIAN_REVIEW → RESOLVED | HOLD | STOP`

Fearprime må ikke autonomt ændre eller eskalere medicinsk behandling.

## Next-best-test

Systemet vælger principielt den næste måling, der bedst kan skelne mellem aktive konkurrerende hypoteser, ikke automatisk den næste eller hårdere intervention.
