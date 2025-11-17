import type { Sequences } from "@/types/types";
import type { Pattern, Voice } from "./types";

/**
 * Converts old Sequences format to new Pattern format
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
