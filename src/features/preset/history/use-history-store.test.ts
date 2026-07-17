/**
 * Unit tests for the history stacks: record/step semantics, hash dedup,
 * future invalidation, and the depth cap. Pure stack bookkeeping - capture
 * and restore behavior is covered in history.test.ts.
 */

import { beforeEach, describe, expect, it } from "vitest";

import type { PresetDocument } from "@/features/preset/document";
import { HISTORY_LIMIT, useHistoryStore } from "./use-history-store";

/**
 * A minimal document stub: hashPresetDocument only needs `meta` (to strip
 * updatedAt) plus JSON-stable content, so the stacks can be exercised
 * without full store scaffolding.
 */
function stubDocument(bpm: number, updatedAt = "2026-01-01T00:00:00.000Z") {
  return {
    meta: {
      id: "history-test",
      name: "History Test",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt,
    },
    transport: { bpm, swing: 0 },
  } as unknown as PresetDocument;
}

beforeEach(() => {
  useHistoryStore.setState({
    past: [],
    present: null,
    presentHash: null,
    future: [],
  });
});

describe("record", () => {
  it("seeds on the first record instead of creating an entry", () => {
    useHistoryStore.getState().record(stubDocument(120));
    const { past, present, future } = useHistoryStore.getState();
    expect(past).toHaveLength(0);
    expect(future).toHaveLength(0);
    expect(present).not.toBeNull();
  });

  it("pushes the previous present into the past", () => {
    const store = useHistoryStore.getState();
    store.seed(stubDocument(120));
    store.record(stubDocument(125));

    const { past, present } = useHistoryStore.getState();
    expect(past).toHaveLength(1);
    expect(past[0].transport.bpm).toBe(120);
    expect(present?.transport.bpm).toBe(125);
  });

  it("drops snapshots whose canonical hash matches the present", () => {
    const store = useHistoryStore.getState();
    store.seed(stubDocument(120));
    // Same content, fresh updatedAt: exactly what a re-snapshot of an
    // unchanged session produces. Must not create an entry.
    store.record(stubDocument(120, "2026-01-02T00:00:00.000Z"));
    expect(useHistoryStore.getState().past).toHaveLength(0);
  });

  it("invalidates the future", () => {
    const store = useHistoryStore.getState();
    store.seed(stubDocument(120));
    store.record(stubDocument(125));
    store.stepBack();
    expect(useHistoryStore.getState().future).toHaveLength(1);

    store.record(stubDocument(130));
    expect(useHistoryStore.getState().future).toHaveLength(0);
  });

  it("caps the past at HISTORY_LIMIT", () => {
    const store = useHistoryStore.getState();
    store.seed(stubDocument(0));
    for (let bpm = 1; bpm <= HISTORY_LIMIT + 10; bpm++) {
      store.record(stubDocument(bpm));
    }

    const { past } = useHistoryStore.getState();
    expect(past).toHaveLength(HISTORY_LIMIT);
    // The oldest entries fell off the bottom.
    expect(past[0].transport.bpm).toBe(10);
  });
});

describe("stepBack / stepForward", () => {
  it("returns null with nothing to step to", () => {
    expect(useHistoryStore.getState().stepBack()).toBeNull();
    expect(useHistoryStore.getState().stepForward()).toBeNull();

    useHistoryStore.getState().seed(stubDocument(120));
    expect(useHistoryStore.getState().stepBack()).toBeNull();
    expect(useHistoryStore.getState().stepForward()).toBeNull();
  });

  it("walks back and forward losslessly", () => {
    const store = useHistoryStore.getState();
    store.seed(stubDocument(120));
    store.record(stubDocument(125));
    store.record(stubDocument(130));

    expect(store.stepBack()?.transport.bpm).toBe(125);
    expect(store.stepBack()?.transport.bpm).toBe(120);
    expect(store.stepBack()).toBeNull();

    expect(store.stepForward()?.transport.bpm).toBe(125);
    expect(store.stepForward()?.transport.bpm).toBe(130);
    expect(store.stepForward()).toBeNull();

    const { past, future, present } = useHistoryStore.getState();
    expect(past).toHaveLength(2);
    expect(future).toHaveLength(0);
    expect(present?.transport.bpm).toBe(130);
  });
});
