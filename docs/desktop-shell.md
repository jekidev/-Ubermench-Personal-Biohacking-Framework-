# Ubermench Desktop Shell

The application shell follows the requested architecture:

```text
Nuxt 4 + Nuxt UI 4
        ↓
Tauri 2 desktop runtime
        ↓
Rust native boundary
        ↓
Local-first Longevity persistence/import layer
```

The shell is intentionally a desktop-first SPA (`ssr: false`). Tauri loads the generated Nuxt static output in production.

## Template basis

The structure follows the current `NicolaSpadari/nuxtor` approach: Nuxt 4 + Nuxt UI 4 + Tauri 2. The existing Ubermench plugin architecture remains above the shell rather than being replaced by the template.

## Commands

```bash
npm install
npm run dev
npm run tauri:dev
npm run build
npm run tauri:build
```

## Boundaries

- Vue/Nuxt owns UI and plugin composition.
- Longevity owns domain models, import contracts and analytics.
- Tauri owns native dialogs, filesystem access and OS integration.
- Health/DNA data remains local-first.
- Native commands must validate all filesystem operations; renderer code should not receive arbitrary write access.

## Longevity routes

- `/longevity`
- `/longevity/bloods`
- `/longevity/genetics`
- `/longevity/cardiovascular`
- `/longevity/metabolic`
- `/longevity/fitness`
- `/longevity/recovery`
- `/longevity/organs`
- `/longevity/prevention`
- `/longevity/interventions`
- `/longevity/evidence`
