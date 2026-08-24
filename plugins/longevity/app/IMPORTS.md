# Longevity data import UI contract

## Blood tests

Dashboard action: **Add blood test**

Modes:
- Upload report
- Import structured file
- Enter results manually

After import:
- show detected collection date
- show lab/source
- preview normalized markers
- highlight ambiguous units/duplicates
- confirm before saving
- append to longitudinal history

## DNA

Dashboard action: **Upload DNA / genetic analysis**

Modes:
- Raw DNA/VCF
- CSV/TSV
- JSON
- PDF report

After import:
- show detected format
- show variant count
- show findings count
- show evidence coverage
- show privacy/storage destination
- require explicit confirmation before analysis

## Dashboard sections

`Overview | Bloods | Genetics | Cardiovascular | Metabolic | Fitness | Recovery | Organ Health | Prevention | Interventions | Evidence`

The Bloods view should support timeline charts and marker-specific history. Genetics should separate raw variants from evidence-backed findings and allow every finding to be traced to its source.
