# Dataism Studios

A monorepo of interactive particle-art installations, all powered by the same `@studio/dataism-core` engine.

## Works

| App | Description |
| | |
| [`apps/dataism-17`](apps/dataism-17/) | The original v1.0 piece. Inspired by Colorpong "Dataism — 17". Six soundscapes, mouse + click interaction, 50k particles. |
| `apps/dronestorm` (planned) | An Atlantic-storm visualization driven by NOAA GFS wind data. |
| `apps/salmonrun` (planned) | A salmon-migration visualization driven by GBIF occurrence data. |

## Architecture

```
dataism/
├── packages/
│   └── dataism-core/        ← Shared engine (R3F + GLSL + Tone.js + UI)
└── apps/
    ├── dataism-17/           ← v1.0 piece (consumes core)
    ├── dronestorm/           ← planned
    └── salmonrun/             ← planned
```

Each app declares its own `App.jsx` / `Credits.jsx` / `data/labels.js` (specific) and imports everything else (particle engine, audio engine, shaders, UI) from `@studio/dataism-core`.

## Setup

```bash
# pnpm 9+ required
pnpm install

# Run any app
pnpm dev:17           # → http://localhost:5173
```

## Status

- **v1.0 — 2026-08-26 — locked**: dataism-17 ships, soundscapes + interaction + showcase assets.
- **v1.1 — planned**: dataism-core exposes a data-source adapter hook for derivative works.