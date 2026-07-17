/**
 * The message transport seam.
 *
 * Production uses a BroadcastChannel; tests use memoryHub() for linked
 * in-memory transports with the same semantics. Both deliver structured
 * clones to every OTHER transport on the channel - never back to the poster -
 * which is exactly how BroadcastChannel behaves between instances in the same
 * browsing context.
 *
 * A transport is a dumb pipe: it delivers raw unknown data and does no
 * validation. Callers (the session) validate with parseBridgeMessage.
 */

import { CHANNEL_NAME, type BridgeMessage } from "./types";

interface BridgeTransport {
  /** Post a message to every other transport on the channel. */
  post(msg: BridgeMessage): void;
  /** Subscribe to incoming raw data; returns an unsubscriber. */
  subscribe(fn: (data: unknown) => void): () => void;
  /** Release underlying resources; posting and delivery stop. */
  close(): void;
}

/** A BroadcastChannel-backed transport (the production default). */
function broadcastChannelTransport(
  name: string = CHANNEL_NAME,
): BridgeTransport {
  const channel = new BroadcastChannel(name);
  const listeners = new Set<(data: unknown) => void>();
  let closed = false;
  channel.onmessage = (event: MessageEvent) => {
    for (const fn of listeners) fn(event.data);
  };
  return {
    post(msg) {
      if (closed) return;
      channel.postMessage(msg);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    close() {
      if (closed) return;
      closed = true;
      listeners.clear();
      channel.close();
    },
  };
}

interface MemoryHub {
  /** Create a new transport linked to every other transport from this hub. */
  createTransport(): BridgeTransport;
}

/**
 * An in-memory BroadcastChannel stand-in for deterministic tests. Delivery is
 * asynchronous (microtask) and payloads are structured-cloned, matching the
 * real channel's semantics: no self-delivery, no shared references, no
 * synchronous reentrancy.
 */
function memoryHub(): MemoryHub {
  const transports = new Set<{
    listeners: Set<(data: unknown) => void>;
    closed: boolean;
  }>();
  return {
    createTransport() {
      const node = {
        listeners: new Set<(data: unknown) => void>(),
        closed: false,
      };
      transports.add(node);
      return {
        post(msg) {
          if (node.closed) return;
          const payload = structuredClone(msg);
          queueMicrotask(() => {
            for (const other of transports) {
              if (other === node || other.closed) continue;
              for (const fn of other.listeners) fn(structuredClone(payload));
            }
          });
        },
        subscribe(fn) {
          node.listeners.add(fn);
          return () => {
            node.listeners.delete(fn);
          };
        },
        close() {
          node.closed = true;
          node.listeners.clear();
          transports.delete(node);
        },
      };
    },
  };
}

export { broadcastChannelTransport, memoryHub };
export type { BridgeTransport, MemoryHub };
