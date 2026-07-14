/**
 * Browser tests for useInstrumentGridShortcuts.
 *
 * Mounts the real hook in Chromium and dispatches real KeyboardEvents on
 * window. Number-key voice selection must be keyed off the physical digit
 * row (event.code), because non-US and custom layouts produce different
 * event.key values for those keys (e.g. French AZERTY gives key "&" for
 * code "Digit1"). Regression test for issue #283.
 */

import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { useInstrumentGridShortcuts } from "@/features/instrument/hooks/use-instrument-grid-shortcuts";

declare global {
  // Required by React so act() can flush effects in tests.
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type HarnessOptions = {
  initialVoiceIndex?: number;
  isAnyDialogOpen?: () => boolean;
};

type Harness = {
  selected: number[];
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

/** Mounts the real hook and records every voice selection it makes. */
async function mountShortcuts({
  initialVoiceIndex = 0,
  isAnyDialogOpen = () => false,
}: HarnessOptions = {}): Promise<Harness> {
  const selected: number[] = [];

  function Host() {
    const [voiceIndex, setVoiceIndex] = useState(initialVoiceIndex);
    useInstrumentGridShortcuts({
      voiceIndex,
      onSelectVoice: (voice) => {
        selected.push(voice);
        setVoiceIndex(voice);
      },
      isAnyDialogOpen,
    });
    return null;
  }

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  // act() flushes the effect that attaches the window listener.
  await act(async () => {
    root?.render(createElement(Host));
  });

  return { selected };
}

/** Dispatches a real keydown and flushes the re-render it may cause. */
async function pressKey(init: KeyboardEventInit): Promise<void> {
  await act(async () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { ...init }));
  });
}

describe("useInstrumentGridShortcuts", () => {
  it("selects voices from digit keys on a US layout", async () => {
    const { selected } = await mountShortcuts();

    await pressKey({ key: "1", code: "Digit1" });
    await pressKey({ key: "8", code: "Digit8" });

    expect(selected).toEqual([0, 7]);
  });

  it("selects voices from the physical digit row on non-US layouts", async () => {
    const { selected } = await mountShortcuts();

    // French AZERTY: unshifted digit row produces symbols, not digits.
    await pressKey({ key: "&", code: "Digit1" });
    await pressKey({ key: "é", code: "Digit2" });
    // Czech: unshifted digit row produces accented letters.
    await pressKey({ key: "ř", code: "Digit5" });

    expect(selected).toEqual([0, 1, 4]);
  });

  it("selects voices from the numpad", async () => {
    const { selected } = await mountShortcuts();

    await pressKey({ key: "3", code: "Numpad3" });

    expect(selected).toEqual([2]);
  });

  it("falls back to event.key when the event carries no code", async () => {
    const { selected } = await mountShortcuts();

    await pressKey({ key: "4", code: "" });

    expect(selected).toEqual([3]);
  });

  it("ignores digit keys outside the 1-8 range", async () => {
    const { selected } = await mountShortcuts();

    await pressKey({ key: "9", code: "Digit9" });
    await pressKey({ key: "0", code: "Digit0" });

    expect(selected).toEqual([]);
  });

  it("navigates with arrow keys regardless of layout", async () => {
    const { selected } = await mountShortcuts({ initialVoiceIndex: 3 });

    await pressKey({ key: "ArrowRight", code: "ArrowRight" });
    await pressKey({ key: "ArrowLeft", code: "ArrowLeft" });

    expect(selected).toEqual([4, 3]);
  });

  it("does nothing while a dialog is open", async () => {
    const { selected } = await mountShortcuts({
      isAnyDialogOpen: () => true,
    });

    await pressKey({ key: "1", code: "Digit1" });
    await pressKey({ key: "ArrowRight", code: "ArrowRight" });

    expect(selected).toEqual([]);
  });
});
