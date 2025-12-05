import type { ToneAudioNode } from "tone/build/esm/index";

import { MasterChainRuntimes } from "./types";

/**
 * Chains master chain nodes in the correct order.
 * Shared between online and offline contexts.
 *
 * @param masterChain The master chain runtimes.
 * @param destination The destination node to chain to
 *        (e.g., getDestination() for online, or offline destination for export).
 */
export function connectMasterChainNodes(
  masterChain: MasterChainRuntimes,
  destination: ToneAudioNode,
): void {
  // Compressor section (front of chain with parallel compression)
  // Wet path: compressor → makeup gain → wet gain
  masterChain.compressor.chain(
    masterChain.compMakeupGain,
    masterChain.compWetGain,
  );
  // Dry path: delay (latency compensation) → dry gain
  masterChain.compDryDelay.connect(masterChain.compDryGain);
  // Both wet and dry paths sum into the low pass filter
  masterChain.compWetGain.connect(masterChain.lowPassFilter);
  masterChain.compDryGain.connect(masterChain.lowPassFilter);

  // Input filters (after compressor section)
  masterChain.lowPassFilter.chain(masterChain.highPassFilter);

  // Parallel phaser send: filtered to keep sub bass clean
  masterChain.highPassFilter.connect(masterChain.phaserPreFilter);
  masterChain.phaserPreFilter.chain(
    masterChain.phaser,
    masterChain.phaserSendGain,
  );
  masterChain.phaserSendGain.connect(masterChain.saturation);

  // Parallel reverb send: filtered to keep low end dry
  masterChain.highPassFilter.connect(masterChain.reverbPreFilter);
  masterChain.reverbPreFilter.chain(
    masterChain.reverb,
    masterChain.reverbSendGain,
  );
  masterChain.reverbSendGain.connect(masterChain.saturation);

  // Output chain: drum saturation (user-controllable) → EQ → limiter
  masterChain.highPassFilter.connect(masterChain.saturation);
  masterChain.saturation.chain(
    masterChain.presenceDip,
    masterChain.highShelf,
    masterChain.limiter,
    destination,
  );
}
