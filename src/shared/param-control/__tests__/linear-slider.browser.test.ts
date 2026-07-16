/**
 * Browser tests for the descriptor-driven LinearSlider (fader).
 *
 * Mounts the real component in Chromium and drives real pointer, keyboard, and
 * input events. The public contract is canonical-only: every assertion is on
 * the CANONICAL value emitted through onChange, never a normalized position.
 */

import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LinearSlider } from "../components/linear-slider";
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

/** Bipolar -1..1 with a centre detent, for the centre-origin fill assertions. */
const panDescriptor: ParamDescriptor<number> = {
  min: -1,
  max: 1,
  taper: { kind: "linear" },
  default: 0,
  polarity: "bipolar",
  detents: [{ value: 0, radiusPct: 0.05 }],
  format: (v) => v.toFixed(2),
};

type Recorded = {
  changes: number[];
  gestureStarts: number;
  gestureEnds: number;
};

type Orientation = "horizontal" | "vertical";

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

async function mount(
  initial = 50,
  orientation: Orientation = "horizontal",
  descriptor: ParamDescriptor<number> = testDescriptor,
) {
  function Host() {
    const [value, setValue] = useState(initial);
    return createElement(LinearSlider<number>, {
      descriptor,
      value,
      label: "Test",
      orientation,
      // Pin the default sensitivity so the drag math is independent of the
      // component's hardware-feel default.
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

function slider(): HTMLElement {
  const el = container?.querySelector('[role="slider"]');
  if (!(el instanceof HTMLElement)) throw new Error("slider not found");
  return el;
}

function last(): number {
  return recorded.changes[recorded.changes.length - 1];
}

async function pointer(
  type: string,
  coord: { x?: number; y?: number },
  shiftKey = false,
) {
  await act(async () => {
    const target = type === "pointerdown" ? slider() : window;
    target.dispatchEvent(
      new PointerEvent(type, {
        clientX: coord.x ?? 0,
        clientY: coord.y ?? 0,
        pointerId: 1,
        bubbles: true,
        cancelable: true,
        shiftKey,
      }),
    );
  });
}

async function keydown(key: string) {
  await act(async () => {
    slider().dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  });
}

describe("LinearSlider interactions (canonical-only public API)", () => {
  it("horizontal drag: right increases, in normalized space", async () => {
    await mount(50, "horizontal");
    await pointer("pointerdown", { x: 0 });
    await pointer("pointermove", { x: 5 }); // 5px > threshold: promotes, no change yet
    await pointer("pointermove", { x: 25 }); // +20px from 5 -> +0.1 pos -> 60
    await pointer("pointerup", { x: 25 });
    expect(last()).toBeCloseTo(60, 6);
  });

  it("vertical drag: up increases, in normalized space", async () => {
    await mount(50, "vertical");
    await pointer("pointerdown", { y: 100 });
    await pointer("pointermove", { y: 95 }); // promote (no change)
    await pointer("pointermove", { y: 75 }); // +20px up -> +0.1 pos -> 60
    await pointer("pointerup", { y: 75 });
    expect(last()).toBeCloseTo(60, 6);
  });

  it("halves the delta while Shift (fine) is held", async () => {
    await mount(50, "horizontal");
    await pointer("pointerdown", { x: 0 });
    await pointer("pointermove", { x: 5 }, true); // promote (no change)
    await pointer("pointermove", { x: 25 }, true); // +20px * 0.25 fine factor -> +0.025 pos -> 52.5
    await pointer("pointerup", { x: 25 }, true);
    expect(last()).toBeCloseTo(52.5, 6);
  });

  it("fires onGestureStart / onGestureEnd exactly once per drag", async () => {
    await mount(50, "horizontal");
    await pointer("pointerdown", { x: 0 });
    await pointer("pointermove", { x: 10 });
    await pointer("pointermove", { x: 20 });
    await pointer("pointerup", { x: 20 });
    expect(recorded.gestureStarts).toBe(1);
    expect(recorded.gestureEnds).toBe(1);
  });

  it("resets to default on double-click", async () => {
    await mount(20, "horizontal");
    await act(async () => {
      slider().dispatchEvent(
        new MouseEvent("dblclick", { bubbles: true, cancelable: true }),
      );
    });
    expect(last()).toBe(50);
  });

  it("snaps to the centre detent under a coarse drag, bipolar", async () => {
    await mount(0, "horizontal", panDescriptor);
    // nudge just off centre; within the 0.05 detent radius -> snaps back to 0
    await pointer("pointerdown", { x: 0 });
    await pointer("pointermove", { x: 4 }); // promote (no change)
    await pointer("pointermove", { x: 8 }); // +4px from 4 -> +0.02 pos, inside radius
    await pointer("pointerup", { x: 8 });
    expect(last()).toBe(0);
  });

  it("steps by keyStep on arrows and keyStepLarge on Page", async () => {
    await mount(50, "horizontal");
    await keydown("ArrowUp"); // +0.01 pos -> 51
    expect(last()).toBeCloseTo(51, 6);
    await keydown("PageUp"); // +0.1 pos -> 61
    expect(last()).toBeCloseTo(61, 6);
  });

  it("jumps to endpoints on Home / End", async () => {
    await mount(50, "horizontal");
    await keydown("End");
    expect(last()).toBe(100);
    await keydown("Home");
    expect(last()).toBe(0);
  });

  it("exposes the display string as aria-valuetext plus aria-orientation", async () => {
    await mount(42, "vertical");
    expect(slider().getAttribute("aria-valuetext")).toBe("42 u");
    expect(slider().getAttribute("aria-valuenow")).toBe("42");
    expect(slider().getAttribute("role")).toBe("slider");
    expect(slider().getAttribute("aria-orientation")).toBe("vertical");
  });

  it("accepts type-in entry parsed through the descriptor", async () => {
    await mount(50, "horizontal");
    // A tap (press released without movement) opens the type-in editor.
    await pointer("pointerdown", { x: 0 });
    await pointer("pointerup", { x: 0 });
    const input = container?.querySelector("input") as HTMLInputElement;
    await act(async () => {
      // Defeat React's controlled-input value tracker so onChange fires.
      const setValue = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setValue?.call(input, "75");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(last()).toBe(75);
  });
});
