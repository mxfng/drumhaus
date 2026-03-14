// ============================================================================
// Types
// ============================================================================

type Range = [number, number];

// ============================================================================
// Instrument defaults & ranges
// ============================================================================

// Tune
const INSTRUMENT_TUNE_BASE_FREQUENCY = 65.4064; // C2
const INSTRUMENT_TUNE_SEMITONE_RANGE = 7;
const INSTRUMENT_TUNE_RANGE: Range = [
  INSTRUMENT_TUNE_BASE_FREQUENCY / 4,
  INSTRUMENT_TUNE_BASE_FREQUENCY * 4,
];
const INSTRUMENT_TUNE_DEFAULT = 50; // Knob center = base frequency

// Level / pan
const INSTRUMENT_VOLUME_RANGE: Range = [-46, 4]; // dB
const INSTRUMENT_VOLUME_DEFAULT = 92; // Knob ~92% = 0 dB
const INSTRUMENT_PAN_RANGE: Range = [-1, 1];
const INSTRUMENT_PAN_DEFAULT = 50;

// Envelope
const INSTRUMENT_DECAY_RANGE: Range = [0.005, 5];
const INSTRUMENT_DECAY_DEFAULT = 100;

// Filter
const INSTRUMENT_FILTER_RANGE: Range = [0, 15000]; // Hz
const INSTRUMENT_FILTER_DEFAULT = 50;

// Solo / mute
const INSTRUMENT_SOLO_DEFAULT = false;
const INSTRUMENT_MUTE_DEFAULT = false;

// ============================================================================
// Master bus: ranges & knob defaults
// ============================================================================

const MASTER_FILTER_RANGE: Range = [0, 15000]; // Hz
const MASTER_FILTER_DEFAULT = 50; // Knob 50 = center (transition point)
const MASTER_LOW_PASS_DEFAULT = 100; // Knob 100 = fully open (legacy)
const MASTER_HIGH_PASS_DEFAULT = 0; // Knob 0 = off (legacy)
const MASTER_SATURATION_WET_RANGE: Range = [0, 1]; // 0-100% wet for drum saturation
const MASTER_SATURATION_AMOUNT_RANGE: Range = [0, 0.25]; // 0-25% drive amount
const MASTER_SATURATION_DEFAULT = 0; // Knob 0 = no saturation

const MASTER_PHASER_WET_RANGE: Range = [0, 1];
const MASTER_PHASER_DEFAULT = 0; // Knob 0 = off

const MASTER_REVERB_WET_RANGE: Range = [0, 1];
const MASTER_REVERB_DEFAULT = 0; // Knob 0 = off
const MASTER_REVERB_DECAY_RANGE: Range = [0.1, 1.5]; // Tighter for drums

const MASTER_VOLUME_RANGE: Range = [-46, 4]; // dB
const MASTER_VOLUME_DEFAULT = 92; // Knob ~92% = 0 dB

// ============================================================================
// Transport
// ============================================================================

const TRANSPORT_BPM_RANGE: Range = [40, 300];

// UI swing control (0–100) mapped to Tone.Transport swing (0–0.5)
const TRANSPORT_SWING_RANGE: Range = [0, 100];
const TRANSPORT_SWING_MAX = 0.5;

// ============================================================================
// Sequencer
// ============================================================================

const STEP_COUNT = 16;
const DEFAULT_VELOCITY = 1.0;

// Shared musical constants
const SAMPLER_ROOT_NOTE = "C2";
const SEQUENCE_SUBDIVISION = "16n";
const SEQUENCE_EVENTS: number[] = Array.from(
  { length: STEP_COUNT },
  (_, i) => i,
);

// ============================================================================
// Master FX: Phaser
// (tuned for drums: movement in upper mids / highs)
// ============================================================================

const MASTER_PHASER_FREQUENCY = 0.5; // Hz - slower LFO for subtle movement
const MASTER_PHASER_OCTAVES = 2; // Narrower sweep
const MASTER_PHASER_BASE_FREQUENCY = 1500; // Hz - avoid low-mid mud
const MASTER_PHASER_Q = 0.5; // Smooth spread, no resonant squeals
const MASTER_PHASER_PRE_FILTER_FREQ = 300; // Hz - sub bass stays clean

// ============================================================================
// Master FX: Reverb
// ============================================================================

// Pre-filter: keeps low end dry (kick / bass)
const MASTER_REVERB_PRE_FILTER_FREQ = 250; // Hz

// ============================================================================
// Master FX: Compressor (API 2500-style, fast timing for drums)
// ============================================================================

// Tone.js Compressor threshold is -100..0 dB; we expose -40..0 on the knob.
// Knob 100% = 0 dB = "off" (minimal compression).
const MASTER_COMP_THRESHOLD_RANGE: Range = [-40, 0];
const MASTER_COMP_DEFAULT_THRESHOLD = 100; // Knob position

const MASTER_COMP_RATIO_RANGE: Range = [1, 8];
const MASTER_COMP_DEFAULT_RATIO = 50; // Knob ~50% ≈ mid ratio (~4.5:1)

const MASTER_COMP_MIX_RANGE: Range = [0, 1]; // Parallel wet/dry
const MASTER_COMP_DEFAULT_MIX = 70; // 70% wet for parallel comp

const MASTER_COMP_ATTACK_RANGE: Range = [0.001, 0.1]; // 1ms - 100ms
const MASTER_COMP_DEFAULT_ATTACK = 50; // Knob ~50% ≈ ~10ms
const MASTER_COMP_ATTACK = 0.01; // 10 ms - catches transients (legacy constant)
const MASTER_COMP_RELEASE = 0.05; // 50 ms - fast recovery, punchy drums
const MASTER_COMP_KNEE = 0; // dB - hard knee
const MASTER_COMP_MAKEUP_GAIN = 1.5; // dB - compensates gain reduction
const MASTER_COMP_LATENCY = 0.006; // 6 ms - lookahead latency compensation

// ============================================================================
// Master FX: Limiter
// ============================================================================

const MASTER_LIMITER_THRESHOLD = -1; // dB - brickwall

// ============================================================================
// Master FX: Analog coloration / EQ
// ============================================================================

// User-controllable drum saturation
const MASTER_SATURATION_OVERSAMPLE = "none";

// High shelf rolloff - tames harsh hats / sibilance
const MASTER_HIGH_SHELF_FREQ = 8000; // Hz
const MASTER_HIGH_SHELF_GAIN = -1.5; // dB

// Presence dip - reduces "ice pick" frequencies
const MASTER_PRESENCE_FREQ = 3500; // Hz
const MASTER_PRESENCE_Q = 1;
const MASTER_PRESENCE_GAIN = -1; // dB

// ============================================================================
// Envelopes
// ============================================================================

const ENVELOPE_DEFAULT_ATTACK = 0;
const ENVELOPE_DEFAULT_DECAY = 0;
const ENVELOPE_DEFAULT_SUSTAIN = 1;
const ENVELOPE_DEFAULT_RELEASE = 0.05;

// ============================================================================
// General split filter
// ============================================================================

const SPLIT_FILTER_DEFAULT_RAMP_TIME = 0.01;
const SPLIT_FILTER_BYPASS_FLOOR_HZ = 10; // Avoid clamping HP to 0 Hz

// ============================================================================
// Export / rendering
// ============================================================================

const EXPORT_TAIL_TIME = 2; // Seconds
const EXPORT_CHANNEL_COUNT = 2;

// ============================================================================
// Audio context
// ============================================================================

const AUDIO_CONTEXT_CHECK_THROTTLE_MS = 100;

// ============================================================================
// Sequencer, Pattern, and Groove
// ============================================================================

const RATCHET_OFFSET_BEATS = 0.125;
const FLAM_OFFSET_SECONDS = 0.015;
const FLAM_GRACE_VELOCITY = 0.6;
/**
 * Accent boost factor (TR-909 style).
 * When a step is accented, its velocity is multiplied by this value.
 * 1.3 = +30% velocity boost for accented steps
 */
const ACCENT_BOOST = 1.3;

/**
 * Velocity dampening factor when accents are present in a variation.
 * Applied to ALL steps to create headroom for accent boost.
 * This ensures accents are audible even when all velocities are at 1.0.
 *
 * Example with all velocities at 1.0:
 * - Non-accented: 1.0 / 1.3 ≈ 0.77 (quieter)
 * - Accented: (1.0 / 1.3) * 1.3 = 1.0 (normal volume)
 */
const ACCENT_DAMPEN = ACCENT_BOOST;

const VARIATION_COUNT = 4;

export {
  INSTRUMENT_TUNE_BASE_FREQUENCY,
  INSTRUMENT_TUNE_SEMITONE_RANGE,
  INSTRUMENT_TUNE_RANGE,
  INSTRUMENT_TUNE_DEFAULT,
  INSTRUMENT_VOLUME_RANGE,
  INSTRUMENT_VOLUME_DEFAULT,
  INSTRUMENT_PAN_RANGE,
  INSTRUMENT_PAN_DEFAULT,
  INSTRUMENT_DECAY_RANGE,
  INSTRUMENT_DECAY_DEFAULT,
  INSTRUMENT_FILTER_RANGE,
  INSTRUMENT_FILTER_DEFAULT,
  INSTRUMENT_SOLO_DEFAULT,
  INSTRUMENT_MUTE_DEFAULT,
  MASTER_FILTER_RANGE,
  MASTER_FILTER_DEFAULT,
  MASTER_LOW_PASS_DEFAULT,
  MASTER_HIGH_PASS_DEFAULT,
  MASTER_SATURATION_WET_RANGE,
  MASTER_SATURATION_AMOUNT_RANGE,
  MASTER_SATURATION_DEFAULT,
  MASTER_PHASER_WET_RANGE,
  MASTER_PHASER_DEFAULT,
  MASTER_REVERB_WET_RANGE,
  MASTER_REVERB_DEFAULT,
  MASTER_REVERB_DECAY_RANGE,
  MASTER_VOLUME_RANGE,
  MASTER_VOLUME_DEFAULT,
  TRANSPORT_BPM_RANGE,
  TRANSPORT_SWING_RANGE,
  TRANSPORT_SWING_MAX,
  STEP_COUNT,
  DEFAULT_VELOCITY,
  SAMPLER_ROOT_NOTE,
  SEQUENCE_SUBDIVISION,
  SEQUENCE_EVENTS,
  MASTER_PHASER_FREQUENCY,
  MASTER_PHASER_OCTAVES,
  MASTER_PHASER_BASE_FREQUENCY,
  MASTER_PHASER_Q,
  MASTER_PHASER_PRE_FILTER_FREQ,
  MASTER_REVERB_PRE_FILTER_FREQ,
  MASTER_COMP_THRESHOLD_RANGE,
  MASTER_COMP_DEFAULT_THRESHOLD,
  MASTER_COMP_RATIO_RANGE,
  MASTER_COMP_DEFAULT_RATIO,
  MASTER_COMP_MIX_RANGE,
  MASTER_COMP_DEFAULT_MIX,
  MASTER_COMP_ATTACK_RANGE,
  MASTER_COMP_DEFAULT_ATTACK,
  MASTER_COMP_ATTACK,
  MASTER_COMP_RELEASE,
  MASTER_COMP_KNEE,
  MASTER_COMP_MAKEUP_GAIN,
  MASTER_COMP_LATENCY,
  MASTER_LIMITER_THRESHOLD,
  MASTER_SATURATION_OVERSAMPLE,
  MASTER_HIGH_SHELF_FREQ,
  MASTER_HIGH_SHELF_GAIN,
  MASTER_PRESENCE_FREQ,
  MASTER_PRESENCE_Q,
  MASTER_PRESENCE_GAIN,
  ENVELOPE_DEFAULT_ATTACK,
  ENVELOPE_DEFAULT_DECAY,
  ENVELOPE_DEFAULT_SUSTAIN,
  ENVELOPE_DEFAULT_RELEASE,
  SPLIT_FILTER_DEFAULT_RAMP_TIME,
  SPLIT_FILTER_BYPASS_FLOOR_HZ,
  EXPORT_TAIL_TIME,
  EXPORT_CHANNEL_COUNT,
  AUDIO_CONTEXT_CHECK_THROTTLE_MS,
  RATCHET_OFFSET_BEATS,
  FLAM_OFFSET_SECONDS,
  FLAM_GRACE_VELOCITY,
  ACCENT_BOOST,
  ACCENT_DAMPEN,
  VARIATION_COUNT,
};
export type { Range };
