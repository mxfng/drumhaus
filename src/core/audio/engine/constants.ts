// ============================================================================
// Types
// ============================================================================

export type Range = [number, number];

// ============================================================================
// Instrument defaults & ranges
// ============================================================================

// Tune
export const INSTRUMENT_TUNE_BASE_FREQUENCY = 65.4064; // C2
export const INSTRUMENT_TUNE_SEMITONE_RANGE = 7;
export const INSTRUMENT_TUNE_RANGE: Range = [
  INSTRUMENT_TUNE_BASE_FREQUENCY / 4,
  INSTRUMENT_TUNE_BASE_FREQUENCY * 4,
];
export const INSTRUMENT_TUNE_DEFAULT = 50; // Knob center = base frequency

// Level / pan
export const INSTRUMENT_VOLUME_RANGE: Range = [-46, 4]; // dB
export const INSTRUMENT_VOLUME_DEFAULT = 92; // Knob ~92% = 0 dB
export const INSTRUMENT_PAN_RANGE: Range = [-1, 1];
export const INSTRUMENT_PAN_DEFAULT = 50;

// Envelope
export const INSTRUMENT_DECAY_RANGE: Range = [0.005, 5];
export const INSTRUMENT_DECAY_DEFAULT = 100;

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
export const MASTER_FILTER_DEFAULT = 50; // Knob 50 = center (transition point)
export const MASTER_LOW_PASS_DEFAULT = 100; // Knob 100 = fully open (legacy)
export const MASTER_HIGH_PASS_DEFAULT = 0; // Knob 0 = off (legacy)
export const MASTER_SATURATION_WET_RANGE: Range = [0, 1]; // 0-100% wet for drum saturation
export const MASTER_SATURATION_AMOUNT_RANGE: Range = [0, 0.25]; // 0-25% drive amount
export const MASTER_SATURATION_DEFAULT = 0; // Knob 0 = no saturation

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

export const MASTER_COMP_ATTACK_RANGE: Range = [0.001, 0.1]; // 1ms - 100ms
export const MASTER_COMP_DEFAULT_ATTACK = 50; // Knob ~50% ≈ ~10ms
export const MASTER_COMP_ATTACK = 0.01; // 10 ms - catches transients (legacy constant)
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

// User-controllable drum saturation
export const MASTER_SATURATION_OVERSAMPLE = "none";

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
// General split filter
// ============================================================================

export const SPLIT_FILTER_DEFAULT_RAMP_TIME = 0.01;
export const SPLIT_FILTER_BYPASS_FLOOR_HZ = 10; // Avoid clamping HP to 0 Hz

// ============================================================================
// Export / rendering
// ============================================================================

export const EXPORT_TAIL_TIME = 2; // Seconds
export const EXPORT_CHANNEL_COUNT = 2;

// ============================================================================
// Audio context
// ============================================================================

export const AUDIO_CONTEXT_CHECK_THROTTLE_MS = 100;

// ============================================================================
// Sequencer, Pattern, and Groove
// ============================================================================

export const RATCHET_OFFSET_BEATS = 0.125;
export const FLAM_OFFSET_SECONDS = 0.015;
export const FLAM_GRACE_VELOCITY = 0.6;
/**
 * Accent boost factor (TR-909 style).
 * When a step is accented, its velocity is multiplied by this value.
 * 1.3 = +30% velocity boost for accented steps
 */
export const ACCENT_BOOST = 1.3;

/**
 * Velocity dampening factor when accents are present in a variation.
 * Applied to ALL steps to create headroom for accent boost.
 * This ensures accents are audible even when all velocities are at 1.0.
 *
 * Example with all velocities at 1.0:
 * - Non-accented: 1.0 / 1.3 ≈ 0.77 (quieter)
 * - Accented: (1.0 / 1.3) * 1.3 = 1.0 (normal volume)
 */
export const ACCENT_DAMPEN = ACCENT_BOOST;

export const VARIATION_COUNT = 4;
