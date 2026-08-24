# Continuous blood-test import protocol

## Goals

- Accept new blood panels repeatedly over time.
- Preserve the original result and source metadata.
- Normalize marker names and units without overwriting raw values.
- Append new panels instead of replacing historical measurements.
- Recalculate longitudinal trends after every successful import.
- Never silently infer a clinical diagnosis from a lab flag.

## Supported input paths

1. Manual entry for individual markers.
2. CSV/TSV/JSON structured lab exports.
3. PDF laboratory reports.
4. OCR fallback for scanned reports.
5. Future connector/API adapters.

## Import pipeline

`file -> checksum -> parser -> canonical marker mapping -> unit normalization -> validation -> append panel -> trend engine -> safety review`

Every import stores `documentName`, collection/report timestamps, laboratory name when available, original label, normalized name, value, unit, reference range, parser version, and import warnings.

## Safety rules

- Keep raw values immutable.
- Do not replace a reference range with a generic range when the laboratory range is available.
- Flag ambiguous units or duplicate markers for review.
- Critical laboratory values may create a `SafetyFlag`, but the application must recommend clinician review rather than diagnose or prescribe.
- All imported health/genetic data should remain local-first in the Tauri application unless the user explicitly enables an external sync.
