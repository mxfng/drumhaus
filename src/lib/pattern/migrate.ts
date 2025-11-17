import type { Sequences } from "@/types/types";
import type { Pattern, StepSequence, Voice } from "./types";

/**
 * Converts old Sequences format to new Pattern format
 * Old: [8 slots][2 variations][2 (triggers/velocities)][16 steps]
 * New: Pattern with 8 Voices, each having instrumentIndex and 2 variations
 */
export function sequencesToPattern(sequences: Sequences): Pattern {
  return sequences.map(
    (voiceSequences: [boolean[], number[]][], instrumentIndex: number) => {
      const voice: Voice = {
        instrumentIndex, // 1:1 mapping (voice index = instrument index)
        variations: [
          {
            triggers: voiceSequences[0][0],
            velocities: voiceSequences[0][1],
          },
          {
            triggers: voiceSequences[1][0],
            velocities: voiceSequences[1][1],
          },
        ],
      };
      return voice;
    },
  );
}

/**
 * Converts new Pattern format back to old Sequences format
 * Useful for understanding the conversion, but not needed since we're doing a breaking change
 */
export function patternToSequences(pattern: Pattern): Sequences {
  // Sort by instrumentIndex to maintain proper slot order
  const sorted = [...pattern].sort(
    (a, b) => a.instrumentIndex - b.instrumentIndex,
  );

  return sorted.map((voice) => [
    [voice.variations[0].triggers, voice.variations[0].velocities],
    [voice.variations[1].triggers, voice.variations[1].velocities],
  ]) as Sequences;
}

/**
 * Creates an empty pattern with all triggers off and velocities at 1.0
 */
export function createEmptyPattern(): Pattern {
  const pattern: Pattern = [];

  for (let instrumentIndex = 0; instrumentIndex < 8; instrumentIndex++) {
    const voice: Voice = {
      instrumentIndex,
      variations: [
        {
          triggers: Array.from({ length: 16 }, () => false),
          velocities: Array.from({ length: 16 }, () => 1),
        },
        {
          triggers: Array.from({ length: 16 }, () => false),
          velocities: Array.from({ length: 16 }, () => 1),
        },
      ],
    };
    pattern.push(voice);
  }

  return pattern;
}
