/**
 * Browser tests for the descriptor-driven ValueField (clickable value).
 *
 * Mounts the real component in Chromium and drives real pointer, keyboard, and
 * input events. The public contract is canonical-only: every assertion is on
 * the CANONICAL value emitted through onChange, never a normalized position.
 * The field disambiguates a tap (type-in) from a drag on one element, so both
 * paths are exercised.
 */

import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ValueField } from "../components/value-field";
import type { ParamDescriptor } from "../types";

declare global {
  // Required by React so act() can flush effects in tests.
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Linear 0..100, display carries a unit so aria-valuetext != the raw number. */
const testDescriptor: ParamDescriptor<number> = {
  min: 0,
  max: 100,
  taper: { kind: "linear" },
  default: 50,
  format: (v) => `${v.toFixed(0)} u`,
  parse: (t) => {
    const n = Number.parseFloat(t);
    return Number.isNaN(n) ? null : n;
  },
};

type Recorded = {
  changes: number[];
  gestureStarts: number;
  gestureEnds: number;
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let recorded: Recorded;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  recorded = { changes: [], gestureStarts: 0, gestureEnds: 0 };
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

async function mount(initial = 50) {
  function Host() {
    const [value, setValue] = useState(initial);
    return createElement(ValueField<number>, {
      descriptor: testDescriptor,
      value,
      label: "level",
      // Pin the sensitivity so the drag math is independent of the
      // global default feel.
      dragSensitivity: 1 / 200,
      onChange: (v: number) => {
        recorded.changes.push(v);
        setValue(v);
      },
      onGestureStart: () => {
        recorded.gestureStarts += 1;
      },
      onGestureEnd: () => {
        recorded.gestureEnds += 1;
      },
    });
  }
  await act(async () => {
    root?.render(createElement(Host));
  });
}

function field(): HTMLElement {
  const el = container?.querySelector('[role="slider"]');
  if (!(el instanceof HTMLElement)) throw new Error("value field not found");
  return el;
}

function input(): HTMLInputElement | null {
  return container?.querySelector("input") ?? null;
}

function last(): number {
  return recorded.changes[recorded.changes.length - 1];
}

async function pointer(
  type: string,
  clientY: number,
  shiftKey = false,
  init: PointerEventInit = {},
) {
  await act(async () => {
    const target = type === "pointerdown" ? field() : window;
    target.dispatchEvent(
      new PointerEvent(type, {
        clientY,
        clientX: 0,
        pointerId: 1,
        bubbles: true,
        cancelable: true,
        shiftKey,
        // Match a real left-button gesture: bit 0 of `buttons` is held through
        // down and move and cleared on up. Chord tests override via `init`.
        buttons: type === "pointerup" ? 0 : 1,
        ...init,
      }),
    );
  });
}

async function keydown(key: string) {
  await act(async () => {
    field().dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  });
}

describe("ValueField interactions (canonical-only public API)", () => {
  it("drags vertically to change value (up increases), past the threshold", async () => {
    await mount(50);
    await pointer("pointerdown", 100);
    await pointer("pointermove", 95); // 5px > threshold: promotes, no change yet
    await pointer("pointermove", 75); // +20px from 95 -> +0.1 pos -> 60
    await pointer("pointerup", 75);
    expect(last()).toBeCloseTo(60, 6);
  });

  it("a drag does not open the type-in editor", async () => {
    await mount(50);
    await pointer("pointerdown", 100);
    await pointer("pointermove", 90);
    await pointer("pointermove", 70);
    await pointer("pointerup", 70);
    expect(input()).toBeNull();
  });

  it("a tap (no movement) opens the type-in editor", async () => {
    await mount(50);
    await pointer("pointerdown", 100);
    await pointer("pointerup", 100); // never crossed the threshold
    expect(input()).not.toBeNull();
    // No value change on a pure tap.
    expect(recorded.changes).toHaveLength(0);
  });

  it("a chorded release of the primary button is not a tap: no editor (#402)", async () => {
    await mount(50);
    await pointer("pointerdown", 100);
    // Right button pressed, then left released before any movement: the
    // release arrives as a pointermove with buttons=2 and cancels the press
    // rather than opening the type-in editor.
    await pointer("pointermove", 100, false, { buttons: 2 });
    expect(input()).toBeNull();
    // The press is already over, so the right button's eventual pointerup
    // (the last button up on this pointer) must not read as a tap either.
    await pointer("pointerup", 100, false, { button: 2 });
    expect(input()).toBeNull();
    expect(recorded.changes).toHaveLength(0);
    expect(recorded.gestureStarts).toBe(0);
    expect(recorded.gestureEnds).toBe(0);
  });

  it("fires onGestureStart / onGestureEnd exactly once per drag", async () => {
    await mount(50);
    await pointer("pointerdown", 100);
    await pointer("pointermove", 90);
    await pointer("pointermove", 80);
    await pointer("pointerup", 80);
    expect(recorded.gestureStarts).toBe(1);
    expect(recorded.gestureEnds).toBe(1);
  });

  it("halves the delta while Shift (fine) is held", async () => {
    await mount(50);
    await pointer("pointerdown", 100);
    await pointer("pointermove", 95, true); // promote (no change)
    await pointer("pointermove", 75, true); // +20px * 0.25 -> +0.025 -> 52.5
    await pointer("pointerup", 75, true);
    expect(last()).toBeCloseTo(52.5, 6);
  });

  it("steps by keyStep on arrows and keyStepLarge on Page", async () => {
    await mount(50);
    await keydown("ArrowUp"); // +0.01 pos -> 51
    expect(last()).toBeCloseTo(51, 6);
    await keydown("PageUp"); // +0.1 pos -> 61
    expect(last()).toBeCloseTo(61, 6);
  });

  it("jumps to endpoints on Home / End", async () => {
    await mount(50);
    await keydown("End");
    expect(last()).toBe(100);
    await keydown("Home");
    expect(last()).toBe(0);
  });

  it("resets to default on Delete (tap is reserved for type-in)", async () => {
    await mount(20);
    await keydown("Delete");
    expect(last()).toBe(50);
  });

  it("exposes the display string as aria-valuetext, not the raw number", async () => {
    await mount(42);
    expect(field().getAttribute("aria-valuetext")).toBe("42 u");
    expect(field().getAttribute("aria-valuenow")).toBe("42");
    expect(field().getAttribute("role")).toBe("slider");
  });

  it("accepts type-in entry parsed through the descriptor", async () => {
    await mount(50);
    // Tap to open the editor.
    await pointer("pointerdown", 100);
    await pointer("pointerup", 100);
    const el = input() as HTMLInputElement;
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setValue?.call(el, "75");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      el.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(last()).toBe(75);
    // The tap opened one gesture; Enter committed and closed it.
    expect(recorded.gestureStarts).toBe(1);
    expect(recorded.gestureEnds).toBe(1);
  });
});
