import * as Tone from "tone/build/esm/index";

import { transformKnobValue } from "@/components/common/Knob";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useSequencerStore } from "@/stores/useSequencerStore";
import { useTransportStore } from "@/stores/useTransportStore";
import { Sample } from "@/types/types";

export default function makeGoodMusic(
  tjsSequencer: React.MutableRefObject<Tone.Sequence<any> | null>,
  samples: Sample[],
  currentChain: number,
  currentBar: React.MutableRefObject<number>,
  currentVariation: React.MutableRefObject<number>,
) {
  tjsSequencer.current = new Tone.Sequence(
    (time, step: number) => {
      // Get FRESH instrument parameters from store on every step (enables live mute/solo)
      const { releases, durations, solos, mutes, pitches } =
        useInstrumentsStore.getState();
      // Get FRESH pattern from store on every step
      const { pattern } = useSequencerStore.getState();

      function triggerSample(instrumentIndex: number, velocity: number) {
        const _pitch = transformKnobValue(
          pitches[instrumentIndex],
          [15.4064, 115.4064],
        );
        samples[instrumentIndex].sampler.triggerRelease(_pitch, time);
        if (samples[instrumentIndex].name !== "OHat") {
          samples[instrumentIndex].sampler.triggerRelease(_pitch, time);
          samples[instrumentIndex].envelope.triggerAttack(time);
          samples[instrumentIndex].envelope.triggerRelease(
            time +
              transformKnobValue(releases[instrumentIndex], [
                0,
                durations[instrumentIndex],
              ]),
          );

          samples[instrumentIndex].sampler.triggerAttack(
            _pitch,
            time,
            velocity,
          );
        } else {
          triggerOHat(velocity, instrumentIndex);
        }
      }

      function muteOHatOnHat(instrumentIndex: number) {
        const _pitch = transformKnobValue(pitches[5], [15.4064, 115.4064]);
        if (instrumentIndex == 4)
          samples[5].sampler.triggerRelease(_pitch, time);
      }

      function triggerOHat(velocity: number, instrumentIndex: number) {
        samples[instrumentIndex].envelope.triggerAttack(time);
        samples[instrumentIndex].envelope.triggerRelease(
          time +
            transformKnobValue(releases[instrumentIndex], [
              0,
              durations[instrumentIndex],
            ]),
        );
        const _pitch = transformKnobValue(
          pitches[instrumentIndex],
          [15.4064, 115.4064],
        );
        samples[instrumentIndex].sampler.triggerAttack(_pitch, time, velocity);
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

      for (let voice = 0; voice < pattern.length; voice++) {
        const instrumentIndex = pattern[voice].instrumentIndex;
        const hit: boolean =
          pattern[voice].variations[currentVariation.current].triggers[step];
        const isSolo = solos[instrumentIndex];
        if (anySolos && !isSolo) {
          continue;
        } else if (hit && !mutes[instrumentIndex]) {
          const velocity: number =
            pattern[voice].variations[currentVariation.current].velocities[
              step
            ];
          muteOHatOnHat(instrumentIndex);
          triggerSample(instrumentIndex, velocity);
        }
      }

      // Update step index in store
      useTransportStore.getState().setStepIndex(step);
      updateBarByChain();
    },
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    "16n",
  ).start(0);
}
