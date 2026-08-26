# `@studio/dataism-core`

Shared engine for [Dataism Studios](https://) particle-art installations.

## What's inside

- **Particle engine** (`ParticleCloud`, `ParticleRain`) — 50k+ WebGL points with GLSL shaders
- **Audio engine** (`AudioController`, `AudioOverlay`) — 6 soundscape presets + interaction-driven volume
- **Interaction layer** (`PointerCatcher`, `InteractionPulse`) — raycaster bridge + UI feedback
- **Overlays** (`LoadingScreen`, `ErrorBoundary`) — generic chrome
- **Shaders** — `cloud.vert/frag`, `rain.vert/frag`, `noise.glsl`

## Usage (in a derivative app)

```jsx
import {
  ParticleCloud,
  ParticleRain,
  PointerCatcher,
  AudioController,
  AudioOverlay,
  LoadingScreen,
  InteractionPulse,
  ErrorBoundary,
  presets,
} from '@studio/dataism-core'
```

## What's NOT in this package

Each derivative app (e.g. `apps/dataism-17`, `apps/dronestorm`, `apps/salmonrun`) keeps its own:

- `App.jsx` — top-level composition
- `Credits.jsx` — credits / About modal
- `data/labels.js` — bottom-bar labels
- `index.html`, `vite.config.js` — Vite entrypoint

## Roadmap

- `v1.0` (current) — particle engine + 6 soundscapes
- `v1.1` — data-source adapter (`useDataSource()` hook for derivative apps)
- `v2.0` — publish to npm registry under `@studio/dataism-core`