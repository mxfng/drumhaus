/**
 * Master Chain Audio Processing
 *
 * Modular master bus processing with parallel compression, FX sends, and output limiting.
 */

import { getDestination, type ToneAudioNode } from "tone/build/esm/index";

import { buildMasterChainNodes, disposeMasterChainNodes } from "./nodes";
import { applySettingsToRuntimes, mapParamsToSettings } from "./params";
import { connectMasterChainNodes } from "./routing";
import { MasterChainParams, MasterChainRuntimes } from "./types";

// Re-export types
export type { MasterChainRuntimes, MasterChainSettings } from "./types";

// Re-export individual functions for granular control
export { buildMasterChainNodes, disposeMasterChainNodes } from "./nodes";
export {
  mapParamsToSettings as mapParamsToSettings,
  applySettingsToRuntimes,
} from "./params";
export { connectMasterChainNodes as chainMasterChainNodes } from "./routing";

// -----------------------------------------------------------------------------
// High-level API
// -----------------------------------------------------------------------------

/**
 * Initializes master chain nodes with settings and chains them to a destination.
 * Shared between online and offline contexts.
 *
 * @param params The master chain parameters from the store
 * @param destination The destination node (getDestination() for online, offline destination for export)
 * @returns The initialized master chain runtimes
 */
export async function initializeMasterChain(
  params: MasterChainParams,
  destination: ToneAudioNode,
): Promise<MasterChainRuntimes> {
  const settings = mapParamsToSettings(params);
  const nodes = await buildMasterChainNodes(settings);
  applySettingsToRuntimes(nodes, settings);
  connectMasterChainNodes(nodes, destination);
  return nodes;
}

/**
 * Creates and initializes all master chain audio runtimes.
 * Returns the new runtimes - caller is responsible for disposing old runtimes first.
 */
export async function createMasterChainRuntimes(
  params: MasterChainParams,
): Promise<MasterChainRuntimes> {
  return await initializeMasterChain(params, getDestination());
}

/**
 * Updates master chain parameter values on existing runtimes.
 */
export function updateMasterChainParams(
  runtimes: MasterChainRuntimes,
  params: MasterChainParams,
): void {
  const settings = mapParamsToSettings(params);
  applySettingsToRuntimes(runtimes, settings);
}

/**
 * Disposes all master chain runtimes.
 * Handles errors gracefully to prevent crashes during cleanup.
 */
export function disposeMasterChainRuntimes(
  runtimes: MasterChainRuntimes | null,
): void {
  disposeMasterChainNodes(runtimes);
}
