import { transformKnobValue } from "@/components/common/Knob";
import { Sample, Sequences } from "@/types/types";
import * as Tone from "tone/build/esm/index";

export default function makeGoodMusic(
  tjsSequencer: React.MutableRefObject<Tone.Sequence<any> | null>,
  samples: Sample[],
  releases: number[],
  durations: number[],
  currentChain: number,
  currentBar: React.MutableRefObject<number>,
  currentVariation: React.MutableRefObject<number>,
  solos: boolean[],
  sequences: Sequences,
  mutes: boolean[],
  pitches: number[],
  setStepIndex: React.Dispatch<React.SetStateAction<number>>
) {
  tjsSequencer.current = new Tone.Sequence(
    (time, step: number) => {
      function triggerSample(slot: number, velocity: number) {
        const _pitch = transformKnobValue(pitches[slot], [15.4064, 115.4064]);
        samples[slot].sampler.triggerRelease(_pitch, time);
        if (samples[slot].name !== "OHat") {
          samples[slot].sampler.triggerRelease(_pitch, time);
          samples[slot].envelope.triggerAttack(time);
          samples[slot].envelope.triggerRelease(
            time + transformKnobValue(releases[slot], [0, durations[slot]])
          );

          samples[slot].sampler.triggerAttack(_pitch, time, velocity);
        } else {
          triggerOHat(velocity, slot);
        }
      }

      function muteOHatOnHat(slot: number) {
        const _pitch = transformKnobValue(pitches[5], [15.4064, 115.4064]);
        if (slot == 4) samples[5].sampler.triggerRelease(_pitch, time);
      }

      function triggerOHat(velocity: number, slot: number) {
        samples[slot].envelope.triggerAttack(time);
        samples[slot].envelope.triggerRelease(
          time + transformKnobValue(releases[slot], [0, durations[slot]])
        );
        const _pitch = transformKnobValue(pitches[slot], [15.4064, 115.4064]);
        samples[slot].sampler.triggerAttack(_pitch, time, velocity);
      }

      function updateBarByChain() {
        if (step === 15) {
          if (
            currentChain < 2 ||
            (currentChain === 2 && currentBar.current > 0) ||
            (currentChain === 3 && currentBar.current > 2)
          ) {
            currentBar.current = 0;
          } else {
            currentBar.current++;
          }
        }
      }

      function updateVariationByChainAndBar() {
        if (step === 0) {
          switch (currentChain) {
            case 0:
              currentVariation.current = 0;
              break;
            case 1:
              currentVariation.current = 1;
              break;
            case 2:
              currentVariation.current = currentBar.current === 0 ? 0 : 1;
              break;
            case 3:
              currentVariation.current = currentBar.current === 3 ? 1 : 0;
              break;
            default:
              currentVariation.current = 0;
          }
        }
      }

      const hasSolos = (solos: boolean[]) =>
        solos.some((value) => value === true);

      updateVariationByChainAndBar();

      const anySolos = hasSolos(solos);

      for (let slot = 0; slot < sequences.length; slot++) {
        const hit: boolean = sequences[slot][currentVariation.current][0][step];
        const isSolo = solos[slot];
        if (anySolos && !isSolo) {
          continue;
        } else if (hit && !mutes[slot]) {
          const velocity: number =
            sequences[slot][currentVariation.current][1][step];
          muteOHatOnHat(slot);
          triggerSample(slot, velocity);
        }
      }

      setStepIndex(step);
      updateBarByChain();
    },
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    "16n"
  ).start(0);
}
