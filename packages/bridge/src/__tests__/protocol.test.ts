/**
 * Envelope validation: parseBridgeMessage must accept well-formed protocol v1
 * messages and defensively reject everything else - other protocol versions
 * may share the channel someday, and a malformed peer must never corrupt
 * session state.
 */

import { describe, expect, it } from "vitest";

import { parseBridgeMessage, type SessionState } from "../types";

const VALID_STATE: SessionState = {
  rev: 3,
  bpm: 120,
  playing: true,
  startEpochMs: 1_000_000,
  scene: 2,
};

describe("parseBridgeMessage", () => {
  it("accepts every well-formed message type", () => {
    const peer = { id: "p1", instrument: "drumhaus", label: "left" };
    const messages = [
      { v: 1, type: "hello", from: "p1", peer },
      { v: 1, type: "heartbeat", from: "p1", peer },
      { v: 1, type: "goodbye", from: "p1" },
      { v: 1, type: "intent", from: "p1", intent: { kind: "setBpm", bpm: 90 } },
      { v: 1, type: "intent", from: "p1", intent: { kind: "play" } },
      { v: 1, type: "intent", from: "p1", intent: { kind: "stop" } },
      {
        v: 1,
        type: "intent",
        from: "p1",
        intent: { kind: "setScene", scene: 3 },
      },
      { v: 1, type: "state", from: "p1", state: VALID_STATE },
    ];
    for (const msg of messages) {
      expect(parseBridgeMessage(msg), JSON.stringify(msg)).toEqual(msg);
    }
  });

  it("accepts a peer without a label", () => {
    const msg = {
      v: 1,
      type: "hello",
      from: "p1",
      peer: { id: "p1", instrument: "drumhaus" },
    };
    expect(parseBridgeMessage(msg)).toEqual(msg);
  });

  it("rejects non-object data", () => {
    expect(parseBridgeMessage(null)).toBeNull();
    expect(parseBridgeMessage(undefined)).toBeNull();
    expect(parseBridgeMessage(42)).toBeNull();
    expect(parseBridgeMessage("hello")).toBeNull();
  });

  it("rejects any protocol version other than 1", () => {
    const base = { type: "goodbye", from: "p1" };
    expect(parseBridgeMessage({ ...base })).toBeNull();
    expect(parseBridgeMessage({ ...base, v: 0 })).toBeNull();
    expect(parseBridgeMessage({ ...base, v: 2 })).toBeNull();
    expect(parseBridgeMessage({ ...base, v: "1" })).toBeNull();
  });

  it("rejects unknown types and missing senders", () => {
    expect(
      parseBridgeMessage({ v: 1, type: "position", from: "p1" }),
    ).toBeNull();
    expect(parseBridgeMessage({ v: 1, type: "goodbye" })).toBeNull();
    expect(parseBridgeMessage({ v: 1, type: "goodbye", from: "" })).toBeNull();
    expect(parseBridgeMessage({ v: 1, type: "goodbye", from: 7 })).toBeNull();
  });

  it("rejects hello/heartbeat whose peer contradicts the envelope", () => {
    const peer = { id: "someone-else", instrument: "drumhaus" };
    expect(
      parseBridgeMessage({ v: 1, type: "hello", from: "p1", peer }),
    ).toBeNull();
    expect(parseBridgeMessage({ v: 1, type: "hello", from: "p1" })).toBeNull();
    expect(
      parseBridgeMessage({
        v: 1,
        type: "heartbeat",
        from: "p1",
        peer: { id: "p1" },
      }),
    ).toBeNull();
  });

  it("rejects malformed intents", () => {
    const intents = [
      undefined,
      {},
      { kind: "warp" },
      { kind: "setBpm" },
      { kind: "setBpm", bpm: "90" },
      { kind: "setBpm", bpm: Number.NaN },
      { kind: "setBpm", bpm: Number.POSITIVE_INFINITY },
      { kind: "setScene", scene: 4 },
      { kind: "setScene", scene: 1.5 },
      { kind: "setScene", scene: "1" },
    ];
    for (const intent of intents) {
      expect(
        parseBridgeMessage({ v: 1, type: "intent", from: "p1", intent }),
        JSON.stringify(intent),
      ).toBeNull();
    }
  });

  it("rejects malformed states", () => {
    const states = [
      undefined,
      {},
      { ...VALID_STATE, rev: 1.5 },
      { ...VALID_STATE, rev: "3" },
      { ...VALID_STATE, bpm: 39 },
      { ...VALID_STATE, bpm: 301 },
      { ...VALID_STATE, bpm: Number.NaN },
      { ...VALID_STATE, playing: "yes" },
      { ...VALID_STATE, scene: 5 },
      // Grid consistency: playing implies a start instant and vice versa.
      { ...VALID_STATE, startEpochMs: null },
      { ...VALID_STATE, playing: false },
      { ...VALID_STATE, startEpochMs: Number.NaN },
    ];
    for (const state of states) {
      expect(
        parseBridgeMessage({ v: 1, type: "state", from: "p1", state }),
        JSON.stringify(state),
      ).toBeNull();
    }
  });
});
