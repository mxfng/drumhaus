import { Pattern, Voice } from "./types";

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
