/**
 * memoryHub transport semantics, which must match BroadcastChannel: delivery
 * to every other transport but never back to the poster, structured-cloned
 * payloads, and closed transports dropping out of the mesh.
 */

import { describe, expect, it } from "vitest";

import { memoryHub } from "../transport";
import type { BridgeMessage } from "../types";
import { flushMicrotasks } from "./helpers/memory-locks";

function goodbye(from: string): BridgeMessage {
  return { v: 1, type: "goodbye", from };
}

describe("memoryHub", () => {
  it("delivers to every other transport but not the poster", async () => {
    const hub = memoryHub();
    const [a, b, c] = [
      hub.createTransport(),
      hub.createTransport(),
      hub.createTransport(),
    ];
    const seen: Record<string, unknown[]> = { a: [], b: [], c: [] };
    a.subscribe((data) => seen.a.push(data));
    b.subscribe((data) => seen.b.push(data));
    c.subscribe((data) => seen.c.push(data));

    a.post(goodbye("peer-a"));
    await flushMicrotasks();

    expect(seen.a).toEqual([]);
    expect(seen.b).toEqual([goodbye("peer-a")]);
    expect(seen.c).toEqual([goodbye("peer-a")]);
  });

  it("delivers asynchronously (no synchronous reentrancy)", () => {
    const hub = memoryHub();
    const a = hub.createTransport();
    const b = hub.createTransport();
    let received = false;
    b.subscribe(() => {
      received = true;
    });
    a.post(goodbye("peer-a"));
    expect(received).toBe(false);
  });

  it("delivers structured clones, not shared references", async () => {
    const hub = memoryHub();
    const a = hub.createTransport();
    const b = hub.createTransport();
    const received: BridgeMessage[] = [];
    b.subscribe((data) => received.push(data as BridgeMessage));

    const original = {
      v: 1,
      type: "hello",
      from: "peer-a",
      peer: { id: "peer-a", instrument: "drumhaus" },
    } as const;
    a.post(original);
    await flushMicrotasks();

    expect(received[0]).toEqual(original);
    expect(received[0]).not.toBe(original);
    expect((received[0] as { peer: object }).peer).not.toBe(original.peer);
  });

  it("stops delivering to and from closed transports", async () => {
    const hub = memoryHub();
    const a = hub.createTransport();
    const b = hub.createTransport();
    const seen: unknown[] = [];
    b.subscribe((data) => seen.push(data));

    b.close();
    a.post(goodbye("peer-a"));
    a.close();
    a.post(goodbye("peer-a"));
    await flushMicrotasks();

    expect(seen).toEqual([]);
  });

  it("honors unsubscribe", async () => {
    const hub = memoryHub();
    const a = hub.createTransport();
    const b = hub.createTransport();
    const seen: unknown[] = [];
    const unsubscribe = b.subscribe((data) => seen.push(data));

    a.post(goodbye("peer-a"));
    await flushMicrotasks();
    unsubscribe();
    a.post(goodbye("peer-a"));
    await flushMicrotasks();

    expect(seen).toHaveLength(1);
  });
});
