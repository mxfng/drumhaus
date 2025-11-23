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
export const MASTER_DEFAULT_LOW_PASS = 100; // Knob position (100 = fully open)
export const MASTER_DEFAULT_HIGH_PASS = 0; // Knob position (0 = off)
export const MASTER_PHASER_WET_RANGE: [number, number] = [0, 1];
export const MASTER_DEFAULT_PHASER = 0; // Knob position (0 = off)
export const MASTER_REVERB_WET_RANGE: [number, number] = [0, 0.5];
export const MASTER_DEFAULT_REVERB = 0; // Knob position (0 = off)
export const MASTER_REVERB_DECAY_RANGE: [number, number] = [0.1, 1.5]; // Tighter for drums
export const MASTER_VOLUME_RANGE: [number, number] = [-46, 4];
export const MASTER_DEFAULT_VOLUME = 92; // Knob position (92% = -0.4dB)
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

// Compressor defaults (API 2500 style - fast timing for drums)
// Tone.js Compressor only supports threshold from -100 to 0 dB
// Use -40 to 0 range (knob at 100 = 0dB = minimal compression)
export const MASTER_COMP_THRESHOLD_RANGE: [number, number] = [-40, 0];
export const MASTER_COMP_DEFAULT_THRESHOLD = 100; // Knob position (100 = 0dB = off)
export const MASTER_COMP_RATIO_RANGE: [number, number] = [1, 8];
export const MASTER_COMP_MIX_RANGE: [number, number] = [0, 100]; // Parallel compression wet/dry (display as %)
export const MASTER_COMP_DEFAULT_MIX = 70; // 70% wet for parallel compression
export const MASTER_COMP_DEFAULT_RATIO = 50; // Knob position (50% = 4.5:1 ratio)
export const MASTER_COMP_ATTACK = 0.01; // 10ms - catches transients
export const MASTER_COMP_RELEASE = 0.05; // 50ms - fast recovery, punchy drums
export const MASTER_COMP_KNEE = 0; // dB - hard knee (API 2500 style)
export const MASTER_COMP_MAKEUP_GAIN = 1.5; // dB - compensates for gain reduction
export const MASTER_COMP_LATENCY = 0.006; // 6ms - compensates for compressor lookahead

// Limiter defaults
export const MASTER_LIMITER_THRESHOLD = -1; // dB - brickwall protection

// Tape emulation - Studer A800 style warmth (hidden processing)
// Low shelf adds NAB-curve bass warmth
export const TAPE_LOW_SHELF_FREQ = 80; // Hz - weight and warmth
export const TAPE_LOW_SHELF_GAIN = 0.8; // dB - lighter low-end bloom
// WaveShaper provides soft saturation with even harmonics
export const TAPE_SATURATION_DRIVE = 1.1; // Softer saturation amount
export const TAPE_SATURATION_ASYMMETRY = 0.15; // Even harmonic content (0 = symmetric/odd only)
export const TAPE_SATURATION_OUTPUT = 0.95; // Slight output reduction (tape compression)
// Pre-saturation presence adds "HF driver" character
export const TAPE_PRESENCE_FREQ = 2500; // Hz - air and clarity
export const TAPE_PRESENCE_Q = 0.8; // Wide and smooth
export const TAPE_PRESENCE_GAIN = 0.6; // dB - subtle lift before saturation
export const MASTER_TAPE_DRIVE_RANGE_DB: [number, number] = [-6, 9]; // Tape drive sweep
export const MASTER_TAPE_DRIVE_DEFAULT = 50; // Knob midpoint = 0 dB (unity into tape)

// Inflator - Oxford Inflator style upward compression (hidden processing)
// Increases perceived loudness without squashing peaks
export const INFLATOR_INPUT_GAIN = -1; // dB - keep drive gentle
export const INFLATOR_EFFECT = 0.15; // Wet/dry mix (15%)
export const INFLATOR_CURVE = 3; // Waveshaping curve intensity (gentler)
export const INFLATOR_OUTPUT_GAIN = -0.5; // dB - subtle compensation
export const INFLATOR_CROSSOVER_FREQ = 240; // Hz - band split frequency
export const MASTER_INFLATOR_AMOUNT_RANGE: [number, number] = [0, 35]; // Wet % range
export const MASTER_INFLATOR_AMOUNT_DEFAULT = 43; // ≈15% wet (legacy setting)

// Tube saturation - FabFilter Saturn 2 Clean Tube style (hidden processing)
// Adds subtle even harmonics for warmth
export const TUBE_DRIVE = 0.045; // 4.5% drive - barely there
export const TUBE_ASYMMETRY = 0.05; // Even harmonic content (tube character)
export const MASTER_SATURATION_DRIVE_RANGE_DB: [number, number] = [-12, 6]; // Tube drive sweep
export const MASTER_SATURATION_DRIVE_DEFAULT = 50; // Midpoint = 0 dB (unity into tube)

// High shelf rolloff - tape head losses and silk top end
export const MASTER_HIGH_SHELF_FREQ = 6000; // Hz - tape-style rolloff point
export const MASTER_HIGH_SHELF_GAIN = -2.5; // dB - smooth "silk" top end

// Presence dip - reduces "ice pick" frequencies
export const MASTER_PRESENCE_FREQ = 3500; // Hz - harsh/fatiguing range
export const MASTER_PRESENCE_Q = 1; // Wide and gentle
export const MASTER_PRESENCE_GAIN = -1; // dB - barely noticeable

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
