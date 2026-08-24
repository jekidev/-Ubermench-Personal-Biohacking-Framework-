# Fearprime plugin

Fearprime er den PTSD/fear-learning/memory-research del af Ubermench Personal Biohacking Framework.

## Arkitektur

Fearprime er et selvstændigt plugin under `plugins/fearprime/` og må ikke gøre den eksisterende framework-core afhængig af PTSD-specifik logik.

## V1 fokus

- kliniske outcomes (PCL-5/CAPS-5/function)
- memory targets
- acquisition / consolidation / retrieval / generalisation / relapse
- prediction lock og learning-quality gate
- 24h / 7d / 30d follow-up
- intervention registry og evidence registry
- sleep, intrusioner og fysiologi
- adverse events og clinician review
- N-of-1 attribution
- offline-first platformfundament

## Implementationsprincip

Klienter: én fælles PWA til Android, iPhone, Mac og PC.

Backend: versionsstyret API + relationel database.

Lokalt: offline event store og sync queue.

Research data: append-only events, immutable prediction locks og audit trail.

## Medicinsk afgrænsning

Fearprime er decision-support/research software. Det ordinerer ikke, ændrer ikke medicin autonomt og eskalerer ikke exposure eller farmacologiske interventioner automatisk.

Eksperimentelle interventionshypoteser skal have:

- eksplicit hypotese
- primært endpoint
- sikkerhedsvariabler
- predefined failure rule
- clinician decision state

## Research-filosofi

Fearprime skal søge information, ikke bare treatment intensity. Når en intervention ikke giver forventet signal, skal systemet kunne nedprioritere den og bevare læringen som negativ evidens.
