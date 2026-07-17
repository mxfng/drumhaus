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

// Level / pan
const INSTRUMENT_VOLUME_RANGE: Range = [-46, 4]; // dB
const INSTRUMENT_PAN_RANGE: Range = [-1, 1];

// Envelope
const INSTRUMENT_DECAY_RANGE: Range = [0.005, 5];

// Filter
const INSTRUMENT_FILTER_RANGE: Range = [0, 15000]; // Hz

// Solo / mute
const INSTRUMENT_SOLO_DEFAULT = false;
const INSTRUMENT_MUTE_DEFAULT = false;

// ============================================================================
// Master bus: canonical ranges
// ============================================================================

const MASTER_FILTER_RANGE: Range = [0, 15000]; // Hz
const MASTER_SATURATION_WET_RANGE: Range = [0, 1]; // 0-100% wet for drum saturation
const MASTER_SATURATION_AMOUNT_RANGE: Range = [0, 0.25]; // 0-25% drive amount

const MASTER_PHASER_WET_RANGE: Range = [0, 1];

const MASTER_REVERB_WET_RANGE: Range = [0, 1];
const MASTER_REVERB_DECAY_RANGE: Range = [0.1, 1.5]; // Tighter for drums

const MASTER_VOLUME_RANGE: Range = [-46, 4]; // dB

// ============================================================================
// Transport
// ============================================================================

const TRANSPORT_BPM_RANGE: Range = [40, 300];

/**
 * Maximum Tone.Transport swing (#269).
 *
 * The ceiling is the TR-909's maximum shuffle: 6 ticks at 96 PPQN = 25% of
 * a 16th note, i.e. MPC 62.5% swing. Tone applies swing as a delay of
 * swing * 1/6 beat on odd 16ths, so 0.375 * 1/6 = 1/16 beat = 25% of a
 * 16th. (The previous ceiling of 0.5 was a full triplet shift, MPC 66.7%.)
 */
const TRANSPORT_SWING_MAX = 0.375;

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

// Tone.js Compressor threshold is -100..0 dB; we expose -40..0 (canonical dB).
const MASTER_COMP_THRESHOLD_RANGE: Range = [-40, 0];

const MASTER_COMP_RATIO_RANGE: Range = [1, 8];

const MASTER_COMP_MIX_RANGE: Range = [0, 1]; // Parallel wet/dry

const MASTER_COMP_ATTACK_RANGE: Range = [0.001, 0.1]; // 1ms - 100ms
// The shipped default compressor attack: the migrated legacy knob-50 value that
// the init preset (init.dh) and the master-chain store hold, expressed as the
// exact stored float64 so descriptor reset lands on it byte-for-byte (no dirty
// flag on a factory-fresh preset). Single source of truth for that default.
const MASTER_COMP_ATTACK_DEFAULT = 0.025750000000000002; // 25.75 ms
const MASTER_COMP_RELEASE = 0.05; // 50 ms - fast recovery, punchy drums
const MASTER_COMP_KNEE = 0; // dB - hard knee
const MASTER_COMP_MAKEUP_GAIN = 1.5; // dB - compensates gain reduction
const MASTER_COMP_LATENCY = 0.006; // 6 ms - lookahead latency compensation

// ============================================================================
// Master FX: Limiter
// ============================================================================

/**
 * Threshold of the musical limiter stage. NOT a brickwall: Tone's Limiter is
 * a DynamicsCompressorNode with ratio 20, a 3ms attack, and the node's
 * default 30 dB soft knee, whose curve spans [threshold, threshold + 30 dB] -
 * so around 0 dBFS it applies almost no gain reduction and transient-heavy
 * material overshoots by a couple of dB (issue #346). The hard output
 * ceiling below is what actually guarantees the bus never exceeds full
 * scale.
 */
const MASTER_LIMITER_THRESHOLD = -1; // dB

/**
 * Hard output ceiling applied as the FINAL master-bus stage (issue #346), in
 * linear amplitude: 0.988 ~ -0.105 dBFS. A memoryless clamp - exactly
 * identity below the ceiling - so it only touches the rare limiter-overshoot
 * peaks that previously clipped anyway (at the DAC live, at the 16-bit PCM
 * encode in exports), and it guarantees offline renders never exceed
 * 0 dBFS. Sits above the limiter's working range (threshold -1 dB = 0.891)
 * so normally-limited program material passes untouched.
 */
const MASTER_OUTPUT_CEILING = 0.988;

/**
 * Sample count of the ceiling's WaveShaper curve. 2001 points over [-1, 1]
 * put a grid point every 0.001, so +/-MASTER_OUTPUT_CEILING (0.988) falls
 * EXACTLY on the grid: every curve segment is then a straight piece of the
 * true clamp function and the WaveShaperNode's linear interpolation
 * reproduces clamp(x) exactly (identity below the knee, ceiling above),
 * instead of smearing the knee across a segment.
 */
const MASTER_OUTPUT_CEILING_CURVE_LENGTH = 2001;

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
/**
 * Resonance Q for the split-filter nodes. Equals Tone's own `Filter` default
 * (1), so wiring Q into the nodes leaves the sound byte-identical; the filter
 * is BUILT to accommodate a real Q even though nothing exposes it yet
 * (docs/data-representation.md, Approved decisions).
 */
const SPLIT_FILTER_DEFAULT_Q = 1;

// ============================================================================
// Export / rendering
// ============================================================================

const EXPORT_TAIL_TIME = 2; // Seconds
const EXPORT_CHANNEL_COUNT = 2;

/**
 * Warm-up pre-roll rendered ahead of the first bar of an offline render and
 * sliced off before the buffer is returned (see renderWav). Chromium's
 * DynamicsCompressorNode initializes its internal gain low and slews up to
 * unity over the first ~100ms of a fresh context, so anything scheduled
 * near t=0 renders quiet (#318); 200ms is a 2x margin over the worst
 * measured warm-up.
 */
const EXPORT_PREROLL_TIME = 0.2; // Seconds

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
  INSTRUMENT_VOLUME_RANGE,
  INSTRUMENT_PAN_RANGE,
  INSTRUMENT_DECAY_RANGE,
  INSTRUMENT_FILTER_RANGE,
  INSTRUMENT_SOLO_DEFAULT,
  INSTRUMENT_MUTE_DEFAULT,
  MASTER_FILTER_RANGE,
  MASTER_SATURATION_WET_RANGE,
  MASTER_SATURATION_AMOUNT_RANGE,
  MASTER_PHASER_WET_RANGE,
  MASTER_REVERB_WET_RANGE,
  MASTER_REVERB_DECAY_RANGE,
  MASTER_VOLUME_RANGE,
  TRANSPORT_BPM_RANGE,
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
  MASTER_COMP_RATIO_RANGE,
  MASTER_COMP_MIX_RANGE,
  MASTER_COMP_ATTACK_RANGE,
  MASTER_COMP_ATTACK_DEFAULT,
  MASTER_COMP_RELEASE,
  MASTER_COMP_KNEE,
  MASTER_COMP_MAKEUP_GAIN,
  MASTER_COMP_LATENCY,
  MASTER_LIMITER_THRESHOLD,
  MASTER_OUTPUT_CEILING,
  MASTER_OUTPUT_CEILING_CURVE_LENGTH,
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
  SPLIT_FILTER_DEFAULT_Q,
  EXPORT_TAIL_TIME,
  EXPORT_CHANNEL_COUNT,
  EXPORT_PREROLL_TIME,
  AUDIO_CONTEXT_CHECK_THROTTLE_MS,
  RATCHET_OFFSET_BEATS,
  FLAM_OFFSET_SECONDS,
  FLAM_GRACE_VELOCITY,
  ACCENT_BOOST,
  ACCENT_DAMPEN,
  VARIATION_COUNT,
};
export type { Range };
