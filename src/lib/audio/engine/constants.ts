// Shared numeric ranges for the audio engine.
// Keeping them here avoids magic numbers scattered across runtime code.
export const ENGINE_PITCH_RANGE: [number, number] = [15.4064, 115.4064];
export const MASTER_FILTER_RANGE: [number, number] = [0, 15000];
export const MASTER_PHASER_WET_RANGE: [number, number] = [0, 1];
export const MASTER_REVERB_WET_RANGE: [number, number] = [0, 0.5];
export const MASTER_REVERB_DECAY_RANGE: [number, number] = [0.1, 3];
export const MASTER_COMP_THRESHOLD_RANGE: [number, number] = [-40, 0];
export const MASTER_COMP_RATIO_RANGE: [number, number] = [1, 8];
export const MASTER_VOLUME_RANGE: [number, number] = [-46, 4];

// Shared musical constants
export const SAMPLER_ROOT_NOTE = "C2";
export const SEQUENCE_SUBDIVISION = "16n";
export const SEQUENCE_EVENTS: number[] = [...Array(16).keys()];
