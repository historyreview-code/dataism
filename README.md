# Dataism Studios

A monorepo of interactive particle-art installations, all powered by the same `@studio/dataism-core` engine.

## Works

| App | Status | Description |
| | | |
| [`apps/dataism-exhibit`](apps/dataism-exhibit/) | **v1.0 · 2026-08-26** | 「时辰 · Twelve Hours」— the flagship gallery piece. Twelve traditional Chinese two-hour chapters rotate automatically: palette, particle behavior, soundscape, poem and data-narrative transition together. Kiosk mode, idle attract mode, live microphone interaction. See [EXHIBIT.md](apps/dataism-exhibit/EXHIBIT.md). |
| [`apps/dataism-17`](apps/dataism-17/) | **v1.0 · locked** | The original piece. Inspired by Colorpong "Dataism — 17". Six soundscapes, mouse + click interaction, 50k particles. Zero visual regression against the locked version (engine theming uses v1.0 values as defaults). |
| [`apps/dronestorm`](apps/dronestorm/) | v1.0 | An Atlantic visualization driven by GFS wind-field data (NDC-projected particles over the North-Atlantic grid). |
| `apps/salmonrun` | planned | A salmon-migration visualization driven by GBIF occurrence data. |

## Architecture

```
dataism/
├── packages/
│   └── dataism-core/        ← Shared engine (R3F + GLSL + Tone.js + chapters + mic + UI)
└── apps/
    ├── dataism-exhibit/      ← 「时辰」 flagship exhibit (chapters + kiosk)
    ├── dataism-17/           ← v1.0 piece (consumes core, default theme = v1.0 values)
    ├── dronestorm/           ← GFS wind-field derivative
    └── salmonrun/            ← planned GBIF derivative
```

`dataism-core` exports: `ParticleCloud` (themeable, deterministic seed), `ParticleRain`, `Scene`, `PointerCatcher`, `AudioController` (preset-driven Tone.js graph + interaction-level coupling), `AudioOverlay`, `InteractionPulse`, `LoadingScreen`, `ErrorBoundary`, `useDataSource`, **`CHAPTERS` / `chapterClockAt` / `useChapter`** (twelve-hour chapter engine, real + synthetic clock), **`useMicInput`** (live-audio → particles, analyser-only, never routed to speakers).

A new derivative work = one chapter/label/data file + one thin app shell. The engine never forks.

## Moat (why this is defensible)

1. **Determinism as provenance** — mulberry32-seeded particle distribution: every render, on every machine, of a given version is bit-identical. Versions are anchored by git tags (`dataism17-v1.0`, `exhibit-v1.0`) and can be authenticated by frame comparison.
2. **Engine-as-asset** — themable shaders, declarative audio presets, chapter engine and kiosk behaviors accumulate in `dataism-core`; each new derivative gets cheaper while the series stays visually consistent, which is hard to clone piecemeal.
3. **GPU-side theme morphing** — chapter transitions lerp uniforms on 50k particles without rebuilding geometry; the "two-hour breathing" of the exhibit costs nothing at runtime.
4. **Data narrative slots** — 巳时/NOAA GFS and 未时/GBIF interfaces are pre-wired in the chapter table; upgrading from poetic simulation to live-data art is a pipeline swap, not a rewrite.

## Setup

```bash
# pnpm 9+ required
pnpm install

pnpm dev                # flagship exhibit 「时辰」 → http://localhost:5176
pnpm dev:17             # original piece          → http://localhost:5173
pnpm dev:storm          # dronestorm              → http://localhost:5175

pnpm build:all          # build every app
```

### Exhibit query flags

`?kiosk=1` (cursor-free, auto-fullscreen, wake-lock) · `?mic=1` (live sound drives particles) · `?audio=1` (soundscape follows the chapter) · `?duration=14` (synthetic 14s-per-chapter demo clock) · `?chapter=午` (pin a chapter) · `?mode=storm` (override soundscape). Keys: `F` fullscreen, `N` next chapter, `I` statement card.

## Status

- **v1.0 — 2026-08-26 — locked**: dataism-17 ships (soundscapes + interaction + showcase assets).
- **v1.1 — 2026-08-26**: engine theming, twelve-hour chapter engine, microphone input, kiosk/attract mode, flagship exhibit 「时辰」. `dataism-core` 1.1.0.
- **next**: salmonrun; live NOAA/GBIF bindings for 巳 and 未 chapters.
