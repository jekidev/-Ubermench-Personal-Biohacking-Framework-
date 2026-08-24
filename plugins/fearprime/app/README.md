# Fearprime app

Minimal Vite/React PWA-skal for Fearprime.

## Formål

Denne klient er kun et UI-lag oven på Fearprime-domænet. Domænelogik, state machine og analyser skal kunne genbruges uden browseren.

## Planlagt næste lag

1. Lokal event-store
2. Formularer for daily state, memory target og learning event
3. Prediction lock
4. Follow-up scheduler
5. Sync queue
6. Clinician/research views
7. Offline cache/service worker

## Kørsel

```bash
npm install
npm run dev
```

Ingen backend er nødvendig for den nuværende prototype.
