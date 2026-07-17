/**
 * A deterministic in-memory Web Locks stand-in (mirrors @haus/bridge's own
 * test helper): FIFO grant order per name, held until the callback's
 * promise settles, abortable while pending, abort ignored after grant.
 */

import type { LockManager } from "@haus/bridge";

interface Waiter {
  granted: boolean;
  aborted: boolean;
  run: () => void;
}

function memoryLocks(): LockManager {
  const held = new Set<string>();
  const queues = new Map<string, Waiter[]>();

  function pump(name: string): void {
    if (held.has(name)) return;
    const queue = queues.get(name);
    while (queue !== undefined && queue.length > 0) {
      const waiter = queue.shift()!;
      if (waiter.aborted) continue;
      waiter.granted = true;
      held.add(name);
      queueMicrotask(waiter.run);
      return;
    }
  }

  return {
    request(name, options, callback) {
      return new Promise((resolve, reject) => {
        const waiter: Waiter = {
          granted: false,
          aborted: false,
          run: () => {
            void (async () => {
              try {
                resolve(await callback());
              } catch (error) {
                reject(error);
              } finally {
                held.delete(name);
                pump(name);
              }
            })();
          },
        };
        options.signal?.addEventListener("abort", () => {
          if (waiter.granted || waiter.aborted) return;
          waiter.aborted = true;
          reject(new DOMException("The request was aborted.", "AbortError"));
        });
        const queue = queues.get(name) ?? [];
        queue.push(waiter);
        queues.set(name, queue);
        pump(name);
      });
    },
  };
}

/** Drain chained microtasks (memory transport delivery, lock grants). */
async function flushMicrotasks(rounds = 25): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

export { flushMicrotasks, memoryLocks };
