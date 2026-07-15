# Audio engine refactor

Status: complete (all five phases landed, July 2026).
Author: Max (drafted with Claude), July 2026.

## Summary

Extract the audio engine into a framework-free `AudioEngine` that owns every Tone.js object, exposes a narrow command API in domain units, and knows nothing about React or Zustand.
State flows one way: `features -> bridge -> engine`.
The refactor lands in five shippable phases, gated by golden offline-render regression tests added before any behavior-adjacent change.

## Diagnosis

The code inside `src/core/audio/engine` is disciplined in the small (focused files, clear naming), but the wiring between the engine, the Zustand stores, and React is tangled.

### 1. The dependency graph is circular

`core/audio` imports from `features/*` in ten places: `usePatternStore`, `useInstrumentsStore`, `useTransportStore`, `useMasterChainStore`, plus sequencer libs and types.
Those same features import back down into `core/audio`.
Worst case: the `Sequence` callback in `engine/sequencer/sequencer.ts` calls `usePatternStore.getState()` and `useInstrumentsStore.getState()` on every 16th note.
The engine cannot be understood, reused, or tested without the entire app's store graph attached.

### 2. UI knob-space leaks into the audio layer

The engine works in 0-100 knob values and converts them at trigger time via `tuneMapping.knobToDomain(...)` and friends.
`engine/instrument/trigger.ts`, `engine/instrument/params.ts`, and `engine/fx/masterChain/params.ts` all import `@/shared/knob/lib/mapping`.
The audio engine should speak domain units (Hz, dB, seconds, playback rate).
How a knob position maps to those units is a UI concern.

### 3. React owns the engine's lifecycle

`hooks/use-audio-engine.ts` is a 256-line god-hook: runtimes in refs, a `useState` version counter to force downstream effects, `isInitialized` flags, hand-rolled async cancellation for kit swaps, and a deliberately incomplete dependency array with a lint suppression.
Engine correctness currently depends on React effect ordering and strict-mode semantics.

### 4. Tone.js nodes are plumbed through the UI

`instrumentRuntimes` travels via React context (`DrumhausProvider`) and props into `InstrumentControl`, `InstrumentHeader`, and `InstrumentParamsControl`.
`togglePlay(instrumentRuntimes.current)` means a persisted Zustand store action takes an array of live audio nodes as an argument.
`useTransportStore` mutates the Tone transport inside `onRehydrateStorage`.
`gain-meter.tsx` and `frequency-analyzer.tsx` construct their own Tone nodes ad hoc.

### 5. Live and offline scheduling are duplicated

`createDrumSequence` (live) and `createOfflineSequence` (WAV export) in `engine/sequencer/sequencer.ts` reimplement the same chain-advance and variation logic with subtle inline differences.
They must be kept in sync by hand for exports to match live playback.

### Smaller issues to clean up along the way

- `scheduleVoiceAtTime` is exported but never imported (dead code).
- `ContinuousRuntimeParams` is defined twice (`instrument/types.ts` and `instrument/params.ts`).
- `engine/index.ts` re-exports functions under different names (`triggerInstrumentReleaseAtTime as stopInstrumentRuntimeAtTime`), which defeats grep.
- Three separate hand-rolled store-diffing implementations exist where `subscribeWithSelector` plus shallow equality would do.
- `scheduleVoiceCore` takes 13 positional arguments.
- Tone.js private-API access (`_sig`, `_activeSources`) is version-locked to `tone@15.5.25` and should stay quarantined in one file.
- The repo has zero tests.
- The known idle-tab silence bug ends in a full page reload (`hooks/use-audio-context-guards.ts`) because there is no way to rebuild the audio graph in place.

### Quirks discovered by the golden render baseline (phase 1a)

- `scheduleVoiceCore` reads `getTransport().bpm` (the live transport) for nudge and ratchet conversion even during offline rendering, because `Offline` restores the global context before the render completes.
  Exports only sound correct because the app happens to keep the live transport bpm in sync with the store.
  Phase 3's pushed snapshots should carry bpm so scheduling never reads the live transport.
- The first hit of any offline render used to peak deterministically about 46% lower than steady state.
  The original "envelope spin-up at t=0" attribution was wrong: measurement traced it to Chromium's DynamicsCompressorNode startup transient, which slews its internal gain up to unity over the first ~100ms of a fresh context (issue #318).
  Fixed by renderWav's 200ms pre-roll (`EXPORT_PREROLL_TIME`): the transport starts past the warm-up and the pre-roll is sliced off, so exports begin on the bar line at full amplitude; step-0 flam graces and negative nudges land inside the pre-roll and are trimmed.

## Target architecture

```
src/core/audio/
  engine/                  # pure TS - no React, no Zustand, no knob mappings
    audio-engine.ts        # facade + lifecycle state machine
    instrument-channel.ts  # class: sampler + envelope + filters + panner
    master-bus.ts          # class: comp / filter / sends / output chain
    scheduler.ts           # ONE scheduler for live + offline
    tone-internals.ts      # quarantined private-API access (_sig, _activeSources)
  bridge/                  # the ONLY place stores meet the engine
    use-engine-bridge.ts   # store subscriptions -> engine commands
    knob-to-domain.ts      # knob mapping applied here, at the boundary
```

### The engine facade

A single class owning channels, master bus, transport, and scheduler, with a narrow command API in domain units:

```ts
engine.loadKit(samples)              // atomic swap, cancellation handled internally
engine.setPattern(precomputed)       // pushed snapshot; scheduler reads engine-owned copy
engine.setPlayback({ chain, chainEnabled, variation })
engine.setChannelParams(i, { volumeDb, pan, filterHz, ... })
engine.setChannelPlayParams(i, { playbackRate, decaySeconds, mute, solo })
engine.setMasterParams(domainValues)
engine.play() / engine.stop() / engine.setTempo(bpm) / engine.setSwing(x)
engine.previewChannel(i)
engine.renderWav(options)            // same scheduler, offline context
engine.onStep(cb)                    // events out, for playhead / step ticker
engine.getAnalyser(i)                // taps for meters and analyzers
engine.rebuild()                     // teardown + reconstruct graph from last-pushed state
```

Key properties:

- **Push, not pull.**
  The app pushes state snapshots into the engine; the scheduler callback reads engine-owned copies.
  Nothing under `engine/` imports from `features/`, `shared/`, or React.
- **Domain units only.**
  All `knobToDomain` mapping happens in the bridge, at the boundary.
- **Cohesion.**
  `InstrumentChannel` collapses today's six free-function files (nodes, routing, params, trigger, lifecycle, solo) into one unit with `trigger(time, hit)`, `choke(time)`, `applyParams()`, and `dispose()`.
  Solo, mute, and hat-choke become engine-internal decisions instead of logic threaded through 13-argument scheduling functions.
- **One scheduler.**
  Live playback and WAV export construct the identical `Scheduler` from the identical snapshot; offline runs it in an `Offline` context with a bar budget.
- **Explicit lifecycle.**
  `uninitialized -> ready -> playing`, plus `rebuild()`.
  Because the engine retains the last-pushed state, context-suspend recovery can rebuild the graph in place before resorting to a page reload.
  This is the direct fix path for the idle-tab silence bug.

### The bridge

One hook replaces `use-audio-engine.ts`: subscribe to each store with `subscribeWithSelector`, map knob values to domain values, call the matching engine command.
Zustand subscriptions fire synchronously on `set`, so a play click still unlocks the AudioContext within the user-gesture task.
Stores go back to being pure state: `togglePlay()` takes no arguments, `onRehydrateStorage` stops touching the transport, and no component ever sees a `Sampler` again.

## Testing strategy

A store-free engine can be tested headlessly.
Golden render tests exercise the offline path: render a pattern via `renderWav`, extract onsets from the buffer, and assert timing and non-silence.
Coverage targets the things this refactor could silently break: swing, timing nudge, flam, ratchet, accent velocity, chain advance, hat choke, solo/mute.

Vitest runs two projects:

- A node project for pure logic (precompute, chain advance, wav encoding).
- A browser-mode project (Chromium via Playwright) for anything that touches Tone.js, since offline rendering needs a real `OfflineAudioContext`.

The golden tests land first, against the current engine, and every later phase must keep them green.

## Migration phases

Each phase is independently shippable.

### Phase 1a: test baseline

- Add vitest with the two projects described above.
- Add golden offline-render tests against the current engine.

### Phase 1b: mechanical decoupling (no behavior change)

- Move all `knobToDomain` calls out of `core/audio` to call sites.
- Delete dead `scheduleVoiceAtTime`.
- Deduplicate `ContinuousRuntimeParams`.
- Drop the re-export aliases in `engine/index.ts`.

### Phase 2: cohesion

- Introduce `InstrumentChannel` and `MasterBus` classes wrapping the existing logic.
- Collapse the free-function modules into them.

### Phase 3: the facade and the push model

- Create `AudioEngine`; move the effect bodies from `use-audio-engine.ts` into engine methods.
- Replace the scheduler's `getState()` pulls with pushed snapshots.
- This is the step that breaks the `core/audio -> features` import cycle.

### Phase 4: bridge and React cleanup

- Add `bridge/use-engine-bridge.ts`.
- Remove `instrumentRuntimes` from context, props, and store actions.
- Purify the transport store.
- Give meters and analyzers engine taps.

### Phase 5: unify offline scheduling, then recovery

- Single `Scheduler` for live playback and WAV export.
- Wire `engine.rebuild()` into `use-audio-context-guards.ts` ahead of the page-reload fallback.

## Risks

- **Timing regressions** (swing, nudge, flam, ratchet) are the main risk; the phase 1a golden renders exist to catch them.
- **Strict-mode double-mount** handling moves from implicit effect gymnastics to an idempotent `engine.init()`.
- **Gesture-gated audio unlock** must keep working; synchronous Zustand subscription dispatch preserves the user-gesture task, and `engine.play()` keeps the `await start()` path.
- **Tone.js internals** (`_sig`, `_activeSources`) remain a version-locked hazard; quarantining them in `tone-internals.ts` limits the blast radius.

## Execution notes (what actually happened)

All five phases landed as designed, gated by the golden suite (44 tests at baseline, 49 at completion).
Notable findings and deviations recorded for posterity:

- **React Compiler interaction.**
  Render-time engine reads (e.g. `engine.isChannelReady(i)`) get memoized by the compiler keyed only on props; a version-counter hook alone does not invalidate them.
  Engine state read during render must go through a subscription-driven snapshot hook (`useSyncExternalStore`), as `bridge/use-kit-version.ts` does.
  This is the established pattern for any future render-time engine reads.
- **MasterBus destination retention.**
  `applySettings` used to write `getDestination().volume` at apply time; since Tone swaps the global context during `Offline` callbacks, a live settings push landing mid-render would have written the live master volume into the render.
  The bus now retains its destination from `create()`.
- **renderWav renders from retained state only.**
  `loadKit` retains kit descriptors and the resolved sample resolver, so `renderWav` needs no store access and no `init()`.
  The golden test helper drives the production render path end to end via a throwaway `AudioEngine`.
- **The playback data model moved engine-side** (`engine/pattern-types.ts`), with the old `features/sequencer` locations kept as re-export shims; `InstrumentData` moved to `features/instrument/types` since it references preset metadata.
- **The transport store issues engine commands directly** (features -> core is the allowed direction); full store purity was deliberately not pursued because the gesture-gated context unlock must run inside the click task.
- **Context recovery** now tries `engine.rebuild()` on the second stalled check and only falls back to the page reload if the clock is still stalled afterwards.

After phase 5, an adversarial review wave (8 finder angles, one verifier per deduplicated candidate) produced 16 verified findings, all fixed and gated by new regression tests (54 tests total at completion).
The most consequential: negative trigger times crashing WAV export for step-0 flams/nudges, missing supersession on init/rebuild concurrency (duplicate master bus), failed kit loads poisoning retained descriptors, and an unbounded rebuild await ahead of the reload fallback.
Three refuted candidates validated the architecture: the scheduler's fresh per-step reads make loadKit/rebuild interleavings safe by construction.

The first-hit attenuation quirk (see above) was left unfixed through the behavior-preserving phases by design; issue #318 diagnosed and fixed it afterward via the render pre-roll.

### Stem rendering options (issue #308)

`renderWav` remains the single offline render path; stem export extends its options instead of adding a parallel renderer.
`soloChannelIndex` isolates one channel by transforming the render's snapshot (the target becomes the only soloed channel and the solo flag is forced on) - retained engine state is never mutated, so live playback is unaffected and a muted channel honestly renders a silent stem.
`masterTap` selects the tap point: `"master"` (default) renders through the full master chain exactly like a mix export, while `"preMaster"` connects the channel chains straight to the offline destination, carrying channel-level processing only (the compressor, saturation, EQ, limiter, and the phaser/reverb sends are master-bus-level and drop out, and master volume stays at unity).
The #318 warm-up pre-roll applies in both modes: the pre-master tap has no compressors to warm up, but one uniform code path keeps every render scheduled, sliced, and sized identically, including step-0 pre-bar trimming.

### Recovery instrumentation (issue #319)

The rebuild recovery path shipped without real-world evidence of which tier actually fires, so the context guards now count every tier: eager resume attempts and successes, stall detections, rebuild attempts, rebuild successes (clock revived), rebuild timeouts, and reload fallbacks.
The counters live in `src/core/audio/hooks/recovery-stats.ts` (outside `engine/`, preserving engine purity) and the guards hook records events around its existing branches without touching the recovery logic.
They persist in localStorage under `drumhaus-audio-recovery-stats` as a small versioned JSON object (`{ version, counters, lastEventAt }`); the reload counter is incremented before the navigation so the otherwise-invisible reload tier survives its own reload.
Storage access is fully guarded: private-browsing or storage-denied modes degrade counting to a no-op while recovery proceeds unchanged.
To read the counters when reproducing the idle-tab scenario: enable Debug Mode from the floating menu, background the tab for 10+ minutes, return and interact, and check the Resume, Stalls, Rebuild, Timeouts, and Reloads rows in the overlay (Resume and Rebuild show success/attempt pairs).
The manual Chrome/Safari validation and any threshold tuning remain open on #319 pending the evidence these counters collect.

### Master output level tap (issue #268)

The facade exposes one more read-only tap alongside `getChannelMeter`: `getMasterLevelDb()`, the master output level in dB RMS measured after the limiter on the live bus, so it reads exactly what reaches the destination.
It is a general surface for audio visualizers (night mode's starfield glow is the first consumer), not a feature-specific hook: consumers poll it from their own animation loops and shape their own attack/release envelopes, which is why the tap is deliberately unsmoothed.
The meter is created lazily on the first poll (the tap costs nothing until something reads it), survives `rebuild()` by being reattached to the replacement bus in `doInit`, and never touches the offline render path.

## Expected outcome

`core/audio` stays around its current size (~2,600 lines) but becomes strictly one-directional and testable.
The features layer shrinks: the god-hook is deleted, prop-drilling of runtimes disappears, and store actions stop taking audio nodes as arguments.
WAV export can no longer drift from live playback.
Context-suspend recovery gains a real repair path instead of a page reload.
