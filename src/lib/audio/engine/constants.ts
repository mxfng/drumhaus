// ============================================================================
// Types
// ============================================================================

export type Range = [number, number];

// ============================================================================
// Instrument defaults & ranges
// ============================================================================

// Pitch
export const INSTRUMENT_PITCH_BASE_FREQUENCY = 65.4064; // C2
export const INSTRUMENT_PITCH_SEMITONE_RANGE = 24;
export const INSTRUMENT_PITCH_RANGE: Range = [
  INSTRUMENT_PITCH_BASE_FREQUENCY / 4,
  INSTRUMENT_PITCH_BASE_FREQUENCY * 4,
];
export const INSTRUMENT_PITCH_DEFAULT = 50; // Knob center = base frequency

// Level / pan
export const INSTRUMENT_VOLUME_RANGE: Range = [-46, 4]; // dB
export const INSTRUMENT_VOLUME_DEFAULT = 92; // Knob ~92% = 0 dB
export const INSTRUMENT_PAN_RANGE: Range = [-1, 1];
export const INSTRUMENT_PAN_DEFAULT = 0;

// Envelope
export const INSTRUMENT_ATTACK_RANGE: Range = [0, 0.1];
export const INSTRUMENT_ATTACK_DEFAULT = 0;
export const INSTRUMENT_RELEASE_RANGE: Range = [0.005, 5];
export const INSTRUMENT_RELEASE_DEFAULT = 100;

// Filter
export const INSTRUMENT_FILTER_RANGE: Range = [0, 15000]; // Hz
export const INSTRUMENT_FILTER_DEFAULT = 50;

// Solo / mute
export const INSTRUMENT_SOLO_DEFAULT = false;
export const INSTRUMENT_MUTE_DEFAULT = false;

// ============================================================================
// Master bus: ranges & knob defaults
// ============================================================================

export const MASTER_FILTER_RANGE: Range = [0, 15000]; // Hz
export const MASTER_LOW_PASS_DEFAULT = 100; // Knob 100 = fully open
export const MASTER_HIGH_PASS_DEFAULT = 0; // Knob 0 = off

export const MASTER_PHASER_WET_RANGE: Range = [0, 1];
export const MASTER_PHASER_DEFAULT = 0; // Knob 0 = off

export const MASTER_REVERB_WET_RANGE: Range = [0, 1];
export const MASTER_REVERB_DEFAULT = 0; // Knob 0 = off
export const MASTER_REVERB_DECAY_RANGE: Range = [0.1, 1.5]; // Tighter for drums

export const MASTER_VOLUME_RANGE: Range = [-46, 4]; // dB
export const MASTER_VOLUME_DEFAULT = 92; // Knob ~92% = 0 dB

// ============================================================================
// Transport
// ============================================================================

export const TRANSPORT_BPM_RANGE: Range = [40, 300];

// UI swing control (0–100) mapped to Tone.Transport swing (0–0.5)
export const TRANSPORT_SWING_RANGE: Range = [0, 100];
export const TRANSPORT_SWING_MAX = 0.5;

// ============================================================================
// Sequencer
// ============================================================================

export const STEP_COUNT = 16;
export const DEFAULT_VELOCITY = 1.0;

// Shared musical constants
export const SAMPLER_ROOT_NOTE = "C2";
export const SEQUENCE_SUBDIVISION = "16n";
export const SEQUENCE_EVENTS: number[] = Array.from(
  { length: STEP_COUNT },
  (_, i) => i,
);

// ============================================================================
// Master FX: Phaser
// (tuned for drums: movement in upper mids / highs)
// ============================================================================

export const MASTER_PHASER_FREQUENCY = 0.5; // Hz - slower LFO for subtle movement
export const MASTER_PHASER_OCTAVES = 2; // Narrower sweep
export const MASTER_PHASER_BASE_FREQUENCY = 1500; // Hz - avoid low-mid mud
export const MASTER_PHASER_Q = 0.5; // Smooth spread, no resonant squeals
export const MASTER_PHASER_PRE_FILTER_FREQ = 300; // Hz - sub bass stays clean

// ============================================================================
// Master FX: Reverb
// ============================================================================

// Pre-filter: keeps low end dry (kick / bass)
export const MASTER_REVERB_PRE_FILTER_FREQ = 250; // Hz

// ============================================================================
// Master FX: Compressor (API 2500-style, fast timing for drums)
// ============================================================================

// Tone.js Compressor threshold is -100..0 dB; we expose -40..0 on the knob.
// Knob 100% = 0 dB = "off" (minimal compression).
export const MASTER_COMP_THRESHOLD_RANGE: Range = [-40, 0];
export const MASTER_COMP_DEFAULT_THRESHOLD = 100; // Knob position

export const MASTER_COMP_RATIO_RANGE: Range = [1, 8];
export const MASTER_COMP_DEFAULT_RATIO = 50; // Knob ~50% ≈ mid ratio (~4.5:1)

export const MASTER_COMP_MIX_RANGE: Range = [0, 1]; // Parallel wet/dry
export const MASTER_COMP_DEFAULT_MIX = 70; // 70% wet for parallel comp

export const MASTER_COMP_ATTACK = 0.01; // 10 ms - catches transients
export const MASTER_COMP_RELEASE = 0.05; // 50 ms - fast recovery, punchy drums
export const MASTER_COMP_KNEE = 0; // dB - hard knee
export const MASTER_COMP_MAKEUP_GAIN = 1.5; // dB - compensates gain reduction
export const MASTER_COMP_LATENCY = 0.006; // 6 ms - lookahead latency compensation

// ============================================================================
// Master FX: Limiter
// ============================================================================

export const MASTER_LIMITER_THRESHOLD = -1; // dB - brickwall

// ============================================================================
// Master FX: Analog coloration / EQ
// ============================================================================

// Saturation (very gentle)
export const MASTER_SATURATION_AMOUNT = 1; // Chebyshev order
export const MASTER_SATURATION_WET = 0.03; // 3% wet

// High shelf rolloff - tames harsh hats / sibilance
export const MASTER_HIGH_SHELF_FREQ = 8000; // Hz
export const MASTER_HIGH_SHELF_GAIN = -1.5; // dB

// Presence dip - reduces "ice pick" frequencies
export const MASTER_PRESENCE_FREQ = 3500; // Hz
export const MASTER_PRESENCE_Q = 1;
export const MASTER_PRESENCE_GAIN = -1; // dB

// ============================================================================
// Envelopes
// ============================================================================

export const ENVELOPE_DEFAULT_ATTACK = 0;
export const ENVELOPE_DEFAULT_DECAY = 0;
export const ENVELOPE_DEFAULT_SUSTAIN = 1;
export const ENVELOPE_DEFAULT_RELEASE = 0.05;

// ============================================================================
// Export / rendering
// ============================================================================

export const EXPORT_TAIL_TIME = 2; // Seconds
export const EXPORT_CHANNEL_COUNT = 2;
