# Fearprime teknisk arkitektur v0.1

## Klient

Første klientmål er en offline-first PWA, så samme applikation kan bruges fra Android, iPhone, Mac og PC. Native wrappers kan tilføjes senere, hvis platform-specifikke features bliver nødvendige.

## Lag

```text
UI
↓
Application services
↓
Domain rules / state machine
↓
Local persistence
↓
Sync API
↓
PostgreSQL
```

Domainlaget må ikke være afhængigt af React, browser-API'er eller en bestemt backend.

## Offline-first

Events oprettes lokalt og får en sync-status. Historiske learning-events er append-only som default. Ændringer håndteres som corrections/audit events frem for destruktive updates.

## Reproducerbarhed

Hver relevant analyse skal kunne rekonstrueres ud fra:

- raw events
- protocol version
- schema version
- algorithm version
- evidence version

## Sikkerhed

Fearprime måler og analyserer; den skal ikke autonomt ordinere, dose-adjustere eller eskalere medicin. Safety flags kan sætte research-flow på hold og kræve clinician review.

## Udviklingsrækkefølge

1. Domain schema
2. Validators
3. Local event store
4. Mobile-first logging UI
5. Sync layer
6. Desktop dashboard
7. Analytics
8. Evidence registry UI
9. Clinician report
10. Advanced hypothesis/next-best-test engine

## Udviklingsprincip

Ingen AI/ML i første beslutningsmotor. Først deterministiske og forklarlige regler; predictive/ML-lag kan tilføjes efter tilstrækkelig validerbar data.
