# Fearprime App

Fearprime is the PTSD / fear-learning research workspace inside the Ubermench Personal Biohacking Framework.

## Stack

- Nuxt 4
- Nuxt UI 4
- Tauri 2
- Vue 3
- TypeScript
- Zod
- Bun
- Tauri Store for local persistence

The application follows the structure and desktop/mobile approach of [Nuxtor](https://github.com/NicolaSpadari/nuxtor), which is an MIT-licensed Nuxt 4 + Tauri 2 starter template. Fearprime does not vendor the template; the implementation is adapted to the framework's plugin boundary.

## Platforms

- Android
- iOS
- macOS
- Windows
- Linux
- Browser/PWA fallback

## Development

```bash
cd plugins/fearprime/app
bun install
bun run dev
```

For Tauri desktop development:

```bash
bun run tauri:dev
```

For Android, initialize the Tauri Android project once in a development checkout and then use:

```bash
bun run tauri:dev:android
```

## Architecture

The UI is deliberately thin. Domain logic remains in `../domain`, `../engine`, `../analytics`, and `../protocols` so the same rules can later be used by desktop, mobile and server components.

The first local persistence layer is event-oriented:

```text
UI
 ↓
validated domain event
 ↓
local event store
 ↓
optional sync queue
 ↓
server/database
```

Raw events are the source of truth. Derived metrics must be reproducible from raw events.

## Safety boundary

Fearprime is a measurement/research platform. It does not autonomously prescribe, escalate, or stop medication. Clinical decisions remain clinician-controlled.
