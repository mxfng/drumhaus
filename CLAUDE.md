# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Drumhaus is a browser-based drum machine and sampler built with React, TypeScript, Tone.js, and Vite. It features a step sequencer with 8 voices, 16 steps, A/B pattern variations, per-instrument parameters, master FX chain, and a custom preset system. Everything runs client-side with offline support.

## Development Commands

```bash
# Development server (runs on port 4444)
npm run dev

# Type checking and build
npm run build

# Linting (must have 0 warnings)
npm run lint

# Code formatting
npm run format

# Create a new drum kit
npm run kit:new

# Generate waveform data for samples
npm run waveforms:build
```

## Architecture

### Core Concepts

**Audio Engine**: The audio engine is built on Tone.js and managed through `src/core/audio/hooks/useAudioEngine.ts`. This hook creates and manages:

- **InstrumentRuntimes**: Array of Tone.js nodes (Player, filters, envelope, etc.) for each of 8 instruments
- **MasterChainRuntimes**: Master output chain (filters, phaser, reverb, compressor)
- **DrumSequence**: Tone.Sequence that triggers instruments on 16th notes

The audio engine rebuilds when samples change and subscribes to parameter stores for real-time updates.

**State Management**: Uses Zustand with immer middleware for all state. Each feature has its own store:

- `useInstrumentsStore`: 8 instruments with per-instrument params (volume, pan, pitch, filters, envelope)
- `usePatternStore`: Sequencer patterns (A/B variations), variation cycle mode (A, B, AB, AAAB)
- `useTransportStore`: BPM, swing, play/pause state
- `useMasterChainStore`: Master FX parameters (filters, phaser, reverb, compressor)
- `usePresetMetaStore`: Current preset metadata (name, description, kit)

All instrument and master chain stores use `persist` middleware for localStorage persistence.

**Preset System**: Presets store complete snapshots of patterns, kit selection, effects, and BPM. They can be:

- Downloaded as `.dh` files (JSON format)
- Loaded from local files
- Shared via URLs using custom compression, bit-packing, and base64url encoding (see `src/features/preset/lib/serialization/`)

The compression pipeline: PresetFileV1 → serialize → compact → compress (pako) → base64url

### Directory Structure

```
src/
├── app/              # App entry point (main.tsx, App.tsx)
├── core/             # Core systems
│   ├── audio/        # Tone.js audio engine
│   │   ├── cache/    # Audio buffer and waveform caching
│   │   ├── engine/   # Audio runtime creation and management
│   │   ├── export/   # WAV export functionality
│   │   └── hooks/    # useAudioEngine, useAudioContextGuards
│   ├── dh/           # Default preset (.dh file)
│   ├── dhkit/        # Default kit (.dhkit file)
│   └── providers/    # React context providers
├── features/         # Feature-based modules
│   ├── debug/        # Debug overlay and controls
│   ├── groove/       # Groove/swing controls
│   ├── instrument/   # Per-instrument controls and parameters
│   ├── kit/          # Kit selection and management
│   ├── master-bus/   # Master FX chain controls
│   ├── preset/       # Preset save/load/share system
│   ├── sequencer/    # Step sequencer grid and patterns
│   └── transport/    # Play/pause, BPM, transport controls
├── layout/           # Layout components
│   ├── desktop/      # Desktop layout (main UI)
│   └── mobile/       # Mobile-responsive layout
└── shared/           # Shared utilities and components
    ├── components/   # Reusable UI components
    ├── dialogs/      # Dialog components (Radix UI)
    ├── hooks/        # Shared hooks
    ├── knob/         # Custom rotary knob controls
    ├── store/        # Global UI stores
    └── ui/           # Base UI components (Radix UI + Tailwind)
```

### Custom File Formats

**.dhkit files**: Drum kit definitions in JSON format. Each kit contains 8 instruments with sample paths, names, and colors. Located in `public/samples/[kit-name]/[kit-name].dhkit`.

**.dh files**: Preset files in JSON format containing complete state snapshots. Can be loaded/saved locally or shared via compressed URL parameters.

**Waveform data**: Pre-generated waveform buckets for visualization stored as compact JSON in `public/waveforms/`. Generated via `scripts/generate-waveforms.ts`.

### Key Technical Details

**Custom Knobs**: Hand-crafted rotary controls built with Framer Motion in `src/shared/knob/`. Features logarithmic responses for frequency parameters and split-range inputs. The knob system includes:

- `useKnobControls`: Drag interaction and value mapping
- `transform.ts`: Value transformations and scaling
- `mapping.ts`: Parameter-specific response curves

**React Compiler**: This project uses the experimental React Compiler (`babel-plugin-react-compiler`) via Vite. Components are automatically optimized for memoization.

**Path Aliases**: Use `@/` to import from `src/`. Example: `import { useInstrumentsStore } from '@/features/instrument/store/useInstrumentsStore'`

**Service Worker**: Offline support via custom service worker in `public/service-worker.js` for caching samples and assets.

**TypeScript**: Strict mode enabled. The codebase uses TypeScript throughout with granular type definitions per feature.

## Working with Audio

When modifying audio-related code:

1. **Audio Context Guards**: The `useAudioContextGuards` hook handles audio context recovery (page visibility, user gestures, stalls). Do not manually manage AudioContext state.

2. **Instrument Runtime Structure**: Each InstrumentRuntime contains Tone.js nodes connected in series:

   ```
   Player → Envelope → HighPass → LowPass → Panner → Volume → [MasterChain]
   ```

3. **Sample Loading**: Samples are loaded via `prepareSampleSourceResolver` which checks cache first, then fetches from public/samples/. All samples are WAV format.

4. **Timing**: The sequencer runs at 16th note resolution. Swing and per-step timing nudges are applied in `src/features/sequencer/lib/timing.ts`.

## Working with Presets

- Presets are versioned (currently V1). When adding new parameters, create migration logic in `src/features/preset/lib/serialization/`.
- Custom kits (user-uploaded samples) cannot be shared via URL - only built-in kits are shareable.
- URL preset format: `?p=[base64url-compressed-preset]`

## UI Patterns

- Use Radix UI primitives from `src/shared/ui/` (Dialog, Tooltip, Select, etc.)
- Tailwind CSS v4 for styling (uses `@theme` directives in CSS)
- Mobile/desktop layouts are separate component trees in `src/layout/`
- Framer Motion for animations and gesture handling

## Testing Changes

There are no automated tests in this repository. Test changes manually by:

1. Running `npm run dev` and testing in browser
2. Verifying audio playback works correctly
3. Testing preset save/load/share flows
4. Checking mobile responsive layout
5. Running `npm run build` to verify production build succeeds

## License

This project is CC BY-NC-SA 4.0 (Attribution-NonCommercial-ShareAlike). Do not suggest changes that would compromise this license.
