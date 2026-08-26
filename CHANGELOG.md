# Changelog

All notable changes to the Dataism Studios monorepo.
Dates are local (UTC+8). Version anchors are git tags.

## [1.1.0] — 2026-08-26 — 「时辰 · Twelve Hours」

The engine grows from "one piece" to "one gallery" — themeable rendering,
a twelve-hour chapter engine, live sound input, and kiosk behaviors.

### dataism-core 1.1.0

- **Themeable ParticleCloud** — palette (`inner/outer/core`) and behavior
  (`flow/noiseAmp/sizeScale/mouseStrength`) injected as shader uniforms
  (`cloud.vert` / `cloud.frag`). Defaults equal the locked v1.0 values, so
  dataism-17 renders identically without passing a theme. Chapter
  transitions lerp colors and scalars with a ~4s time constant — no
  geometry rebuild for 50k particles.
- **Chapter engine** — `CHAPTERS` (twelve 时辰 with id / branch / poem /
  palette / behavior / soundscape / data-note), `chapterClockAt`,
  `chapterByBranch`, `chapterById`, `CHAPTER_MS`, and `useChapter`
  (real 2h clock + synthetic fast clock for demos, `forceNext()`).
- **Microphone input** — `useMicInput`: getUserMedia → AnalyserNode
  (fftSize 1024), levels `{low, mid, high, beat}` with onset detection.
  Analyser-only routing: live sound never reaches the speakers, so no
  feedback loop is possible. Clean teardown of tracks + context.
- **Multi-source audio merge** — `ParticleCloud` accepts an array of
  level refs and drives particles with the per-band max: Tone.js spectrum
  and live microphone combine.
- `Scene` forwards a `theme` prop.

### apps/dataism-exhibit (new — the flagship)

- 「时辰 · Twelve Hours」: every two hours the piece changes palette,
  particle temperament, soundscape, poem and data narrative; a full day
  shows all twelve chapters.
- Chapter card (地支 large glyph + poem + data note), clock strip
  (current chapter + progress + next countdown), statement card with
  chapter overview and soundscape picker.
- **Kiosk mode** (`?kiosk=1`): hidden cursor and chrome, first-gesture
  fullscreen, Screen Wake Lock (re-requested on visibility change),
  context menu disabled.
- **Idle attract mode**: after 45s without input the piece performs
  itself (virtual cursor orbit + periodic ripples) until a real input
  arrives.
- Query flags: `?kiosk&mic&audio&duration&chapter&mode`. Keys `F`/`N`/`I`.
- EXHIBIT.md — curatorial statement, chapter table, deployment and
  hardware guide.

### apps/dronestorm

- Fixed a black screen: stray orphan code block after the particle
  sampler (leftover from the NDC projection edit) broke the build; the
  NDC projection itself was already correct.

### Repo

- README rewritten (works table, architecture, moat, flags).
- LICENSE added (all rights reserved).

## [1.0.0] — 2026-08-26 — dataism-17 locked

- 50,000-particle GLSL cloud with deterministic mulberry32 seeding.
- Six soundscapes (drift / bloom / pulse / storm / tide / drone) as
  declarative Tone.js node graphs; interaction-level ↔ volume coupling.
- Mouse disturb + click ripple; InteractionPulse indicator.
- Showcase assets; monorepo layout with `@studio/dataism-core`.
