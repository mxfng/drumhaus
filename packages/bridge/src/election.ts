/**
 * Conductor election over the Web Locks API.
 *
 * Every connected session requests the same lock; the holder is the
 * conductor. Web Locks queue waiters and release automatically when the
 * holding context goes away (tab close, crash, navigation), so failover needs
 * no protocol traffic: the next waiter is simply granted the lock and calls
 * onAcquired.
 *
 * Scope and support: Web Locks are shared across same-origin browsing
 * contexts in one browser on one machine - exactly the bridge's session
 * boundary - and require a secure context. Supported in Chrome 69+, Edge 79+,
 * Firefox 96+, and Safari 15.4+. If the API is missing entirely, the election
 * degrades to granting immediately (each tab conducts itself); cross-tab
 * dedup of conductorship requires Web Locks.
 */

import { LOCK_NAME } from "./types";

/**
 * The subset of navigator.locks the election needs; injectable for
 * deterministic tests and for lock-name scoping.
 */
interface LockManager {
  request(
    name: string,
    options: { signal?: AbortSignal },
    callback: () => Promise<void> | void,
  ): Promise<unknown>;
}

interface ConductorElectionOptions {
  /** Called exactly once per start() cycle, when this peer becomes conductor. */
  onAcquired: () => void;
  /** Lock name; defaults to LOCK_NAME. */
  name?: string;
  /** Lock manager; defaults to navigator.locks (with the fallback above). */
  locks?: LockManager;
}

interface ConductorElection {
  /** Join the election (request the lock). Idempotent while running. */
  start(): void;
  /**
   * Leave the election: withdraw a pending request, or release the lock if
   * held so the next waiter takes over.
   */
  stop(): void;
}

/** Immediate-grant stand-in for environments without Web Locks. */
function soloLocks(): LockManager {
  return {
    async request(_name, _options, callback) {
      return await callback();
    },
  };
}

function defaultLocks(): LockManager {
  const locks = globalThis.navigator?.locks;
  return locks ?? soloLocks();
}

function createConductorElection(
  options: ConductorElectionOptions,
): ConductorElection {
  const name = options.name ?? LOCK_NAME;
  const locks = options.locks ?? defaultLocks();
  let running = false;
  let controller: AbortController | null = null;
  let releaseHeld: (() => void) | null = null;

  return {
    start() {
      if (running) return;
      running = true;
      const cycle = new AbortController();
      controller = cycle;
      void locks
        .request(name, { signal: cycle.signal }, () => {
          // stop() may have raced the grant; hold nothing in that case.
          if (!running || controller !== cycle) return;
          options.onAcquired();
          return new Promise<void>((resolve) => {
            releaseHeld = resolve;
          });
        })
        .catch(() => {
          // AbortError from stop() before the grant; nothing to do.
        });
    },
    stop() {
      if (!running) return;
      running = false;
      releaseHeld?.();
      releaseHeld = null;
      controller?.abort();
      controller = null;
    },
  };
}

export { createConductorElection };
export type { ConductorElection, ConductorElectionOptions, LockManager };
