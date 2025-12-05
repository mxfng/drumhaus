import { MasterChainRuntimes } from "../fx/masterChain/types";
import { InstrumentRuntime } from "./types";

/**
 * Chains instrument nodes in signal flow order:
 * Sampler → Envelope → Filters → Panner
 */
export function chainInstrumentNodes(runtime: InstrumentRuntime): void {
  runtime.samplerNode.chain(
    runtime.envelopeNode,
    runtime.lowPassFilterNode,
    runtime.highPassFilterNode,
    runtime.pannerNode,
  );
}

/**
 * Connects an instrument runtime to the master chain.
 * Routes instrument output to parallel compression section.
 *
 * Signal splits at output:
 * - Wet path: through compressor
 * - Dry path: through latency-compensated delay
 */
export function connectInstrumentToMasterChain(
  instrumentRuntime: InstrumentRuntime,
  masterChainRuntimes: MasterChainRuntimes,
): void {
  // Chain internal nodes first
  chainInstrumentNodes(instrumentRuntime);

  // Connect to master chain (parallel compression)
  instrumentRuntime.pannerNode.connect(masterChainRuntimes.compressor); // Wet path
  instrumentRuntime.pannerNode.connect(masterChainRuntimes.compDryDelay); // Dry path (latency comp)
}

/**
 * Connects multiple instrument runtimes to the master chain.
 */
export function connectInstrumentsToMasterChain(
  instrumentRuntimes: InstrumentRuntime[],
  masterChainRuntimes: MasterChainRuntimes,
): void {
  instrumentRuntimes.forEach((inst) =>
    connectInstrumentToMasterChain(inst, masterChainRuntimes),
  );
}
