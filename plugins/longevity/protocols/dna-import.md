# DNA upload and analysis protocol

## Upload UX

The Longevity plugin should expose:

- `Upload DNA test`
- `Import VCF`
- `Import CSV/TSV`
- `Import JSON`
- `Import laboratory genetic report (PDF)`

The user must be shown the filename, detected format, number of variants/findings, parser version, and any warnings before committing the import.

## Processing

`file -> checksum -> format detection -> parse -> validate -> normalize variants -> local genomic profile -> evidence interpretation`

The original file should be retained locally when possible so every interpretation can be traced back to source data.

## Interpretation layers

### Layer 1 — raw genetics

Store rsID/genotype and source information without interpretation.

### Layer 2 — evidence

Map variants to curated findings only when a source and evidence grade are available. Store the source reference and review date.

### Layer 3 — personal context

Cross-reference findings with the Longevity dashboard, laboratory data, medications, and interventions. This layer must remain explicitly informational and must not turn a genetic association into a diagnosis or medication recommendation.

## Privacy

Genetic data is highly sensitive. Default to local-only storage in the Tauri app. Do not upload DNA files to third-party services by default. External analysis must require an explicit user action and clear disclosure of the destination.

## Important limitation

Consumer DNA reports can contain incomplete coverage and can misclassify variants. The plugin should distinguish raw genotype data, laboratory interpretation, and framework-generated interpretation rather than presenting all three as equivalent clinical evidence.
