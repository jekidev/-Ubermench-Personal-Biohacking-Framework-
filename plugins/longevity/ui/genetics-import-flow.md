# Longevity Genetics — Import Flow

## Goal

Provide a local-first upload and review workflow for raw DNA files and genetic-analysis reports.

## Supported source classes

- VCF
- CSV/TSV variant exports
- JSON variant exports
- raw-DNA exports where the parser contract is known
- PDF genetic-analysis reports

## User flow

1. Open `Longevity → Genetics → Upload DNA`.
2. Select a source document.
3. Compute a source fingerprint locally.
4. Parse variants/findings without modifying the original source.
5. Show an editable preview.
6. Confirm import.
7. Store raw variant records separately from interpretation records.
8. Link interpretations to evidence records and version them independently.

## Data separation

```text
Original DNA file
      ↓
Raw variant record
      ↓
Evidence mapping
      ↓
Interpretation
      ↓
Dashboard finding
```

A later evidence update must never rewrite the original genotype.

## Privacy rules

- Genetic source files are local-only by default.
- No automatic external genomic lookup.
- No automatic medical diagnosis.
- Store source fingerprint and provenance.
- Keep interpretation versioned so a future evidence update can be compared with the prior interpretation.

## Review states

- `candidate`
- `confirmed`
- `rejected`
- `needs-review`

Low-confidence extraction and clinically important findings should remain `needs-review` until explicitly confirmed.
