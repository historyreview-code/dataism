# Dataism — 17

An interactive particle-art piece. Inspired by Colorpong's "Dataism" series.

## Run

```bash
pnpm install    # workspace-level
pnpm dev        # → http://localhost:5173
```

## What you see

- 50,000 white particles arranged in a horizontal elliptical cloud with a central black void
- Radial color gradient: cold blue (#8CC4FF) at the core, warm orange (#FFA94D) at the periphery
- Five animated effects: horizontal flow, outer-ring noise perturbation, mouse attraction, click ripple, audio-reactive flow

## What you hear

Six soundscapes (selectable in the Credits → Soundscape tab):
- **Drift** — pure ambient drone
- **Bloom** — organic breathing
- **Pulse** — rhythmic heartbeat
- **Storm** — atmospheric noise
- **Tide** — slow tidal motion
- **Drone** — human-made hum, "a record of the drone age"

## What you interact with

- Move mouse — disturb the cloud
- Click — send a ripple
- Scroll — zoom
- Press **F** — fullscreen
- Tap the **♪** icon (top-right) — enable sound
- Click the **i** icon (bottom-left) — credits & soundscape selector

## Architecture

This app consumes `@studio/dataism-core` for everything except its own `App.jsx` / `Credits.jsx` / `data/labels.js`. See [the monorepo README](../../README.md).

## Showcase

See [`showcase/`](showcase/) for recorded demo videos + GIF previews.