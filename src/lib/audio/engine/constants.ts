// --- Shared numeric constants and ranges for the audio engine ---

// Keeping them here avoids magic numbers scattered across runtime code.
export const INSTRUMENT_PITCH_BASE_FREQUENCY = 65.4064; // C2
export const INSTRUMENT_PITCH_SEMITONE_RANGE = 24;
export const INSTRUMENT_PITCH_RANGE: [number, number] = [
  INSTRUMENT_PITCH_BASE_FREQUENCY / 4,
  INSTRUMENT_PITCH_BASE_FREQUENCY * 4,
];
export const INSTRUMENT_VOLUME_RANGE: [number, number] = [-46, 4];
export const INSTRUMENT_PAN_RANGE: [number, number] = [-1, 1];
export const INSTRUMENT_ATTACK_RANGE: [number, number] = [0, 0.1];
export const INSTRUMENT_RELEASE_RANGE: [number, number] = [0.005, 5];
export const INSTRUMENT_FILTER_RANGE: [number, number] = [0, 15000];
export const MASTER_FILTER_RANGE: [number, number] = [0, 15000];
export const MASTER_PHASER_WET_RANGE: [number, number] = [0, 1];
export const MASTER_REVERB_WET_RANGE: [number, number] = [0, 0.5];
export const MASTER_REVERB_DECAY_RANGE: [number, number] = [0.1, 1.5]; // Tighter for drums
export const MASTER_COMP_THRESHOLD_RANGE: [number, number] = [-40, 0];
export const MASTER_COMP_RATIO_RANGE: [number, number] = [1, 8];
export const MASTER_VOLUME_RANGE: [number, number] = [-46, 4];
export const TRANSPORT_SWING_RANGE: [number, number] = [0, 100];
export const TRANSPORT_BPM_RANGE: [number, number] = [1, 300];

// Sequencer constants
export const STEP_COUNT = 16;
export const DEFAULT_VELOCITY = 1.0;

// Shared musical constants
export const SAMPLER_ROOT_NOTE = "C2";
export const SEQUENCE_SUBDIVISION = "16n";
export const SEQUENCE_EVENTS: number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

// Phaser defaults (tuned for drums - keeps effect in upper mids/highs)
export const MASTER_PHASER_FREQUENCY = 0.5; // Slower LFO for subtle movement
export const MASTER_PHASER_OCTAVES = 2; // Narrower sweep
export const MASTER_PHASER_BASE_FREQUENCY = 1500; // Start higher to avoid low-mid mud
export const MASTER_PHASER_Q = 0.5; // Low Q = smooth spread, no resonant squeals
export const MASTER_PHASER_PRE_FILTER_FREQ = 300; // Hz - sub bass stays clean

// Reverb pre-filter (keeps low end dry)
export const MASTER_REVERB_PRE_FILTER_FREQ = 250; // Hz - kick/bass stays dry

// Compressor defaults (fast timing for drums)
export const MASTER_COMP_ATTACK = 0.01; // 10ms - catches transients
export const MASTER_COMP_RELEASE = 0.15; // 150ms - recovers between hits

// Limiter defaults
export const MASTER_LIMITER_THRESHOLD = -1; // dB - brickwall protection

// Envelope defaults
export const ENVELOPE_DEFAULT_ATTACK = 0;
export const ENVELOPE_DEFAULT_DECAY = 0;
export const ENVELOPE_DEFAULT_SUSTAIN = 1;
export const ENVELOPE_DEFAULT_RELEASE = 0.05;

// Transport
export const TRANSPORT_SWING_MAX = 0.5;

// Export
export const EXPORT_TAIL_TIME = 2;
export const EXPORT_CHANNEL_COUNT = 2;
