import * as Tone from "tone/build/esm/index";

import { transformKnobValue } from "@/components/common/Knob";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useSequencerStore } from "@/stores/useSequencerStore";
import { useTransportStore } from "@/stores/useTransportStore";
import { Instrument } from "@/types/types";

export default function makeGoodMusic(
  tjsSequencer: React.MutableRefObject<Tone.Sequence<any> | null>,
  instruments: Instrument[],
  currentChain: number,
  currentBar: React.MutableRefObject<number>,
  currentVariation: React.MutableRefObject<number>,
) {
  tjsSequencer.current = new Tone.Sequence(
    (time, step: number) => {
      // Get FRESH instrument parameters from store on every step (enables live mute/solo)
      const { instruments: instrumentData, durations } =
        useInstrumentsStore.getState();
      const releases = instrumentData.map((inst) => inst.release);
      const solos = instrumentData.map((inst) => inst.solo);
      const mutes = instrumentData.map((inst) => inst.mute);
      const pitches = instrumentData.map((inst) => inst.pitch);

      // Get FRESH pattern from store on every step
      const { pattern } = useSequencerStore.getState();

      function triggerSample(instrumentIndex: number, velocity: number) {
        const _pitch = transformKnobValue(
          pitches[instrumentIndex],
          [15.4064, 115.4064],
        );
        instruments[instrumentIndex].samplerNode.triggerRelease(_pitch, time);
        if (instruments[instrumentIndex].name !== "OHat") {
          instruments[instrumentIndex].samplerNode.triggerRelease(_pitch, time);
          instruments[instrumentIndex].envelopeNode.triggerAttack(time);
          instruments[instrumentIndex].envelopeNode.triggerRelease(
            time +
              transformKnobValue(releases[instrumentIndex], [
                0,
                durations[instrumentIndex],
              ]),
          );

          instruments[instrumentIndex].samplerNode.triggerAttack(
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
          instruments[5].samplerNode.triggerRelease(_pitch, time);
      }

      function triggerOHat(velocity: number, instrumentIndex: number) {
        instruments[instrumentIndex].envelopeNode.triggerAttack(time);
        instruments[instrumentIndex].envelopeNode.triggerRelease(
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
        instruments[instrumentIndex].samplerNode.triggerAttack(
          _pitch,
          time,
          velocity,
        );
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
