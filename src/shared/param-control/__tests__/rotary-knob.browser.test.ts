/**
 * Browser tests for the descriptor-driven RotaryKnob.
 *
 * Mounts the real component in Chromium and drives real pointer, keyboard, and
 * input events. The public contract is canonical-only: every assertion is on
 * the CANONICAL value emitted through onChange, never a normalized position.
 */

import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { RotaryKnob } from "../components/rotary-knob";
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
    return createElement(RotaryKnob<number>, {
      descriptor: testDescriptor,
      value,
      label: "Test",
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

function label(): HTMLElement {
  const el = container?.querySelector('[data-slot="label"]');
  if (!(el instanceof HTMLElement)) throw new Error("label not found");
  return el;
}

function last(): number {
  return recorded.changes[recorded.changes.length - 1];
}

async function pointer(type: string, clientY: number, shiftKey = false) {
  await act(async () => {
    const target = type === "pointerdown" ? slider() : window;
    target.dispatchEvent(
      new PointerEvent(type, {
        clientY,
        clientX: 0,
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

describe("RotaryKnob interactions (canonical-only public API)", () => {
  it("drags in normalized space and emits canonical values", async () => {
    await mount(50); // pos 0.5
    await pointer("pointerdown", 100);
    await pointer("pointermove", 95); // 5px > threshold: promotes, no change yet
    await pointer("pointermove", 75); // +20px from 95 -> +0.1 pos -> 60
    await pointer("pointerup", 75);
    expect(last()).toBeCloseTo(60, 6);
  });

  it("halves the delta while Shift (fine) is held", async () => {
    await mount(50);
    await pointer("pointerdown", 100);
    await pointer("pointermove", 95, true); // promote (no change)
    await pointer("pointermove", 75, true); // +20px * 0.25 fine factor -> +0.025 pos -> 52.5
    await pointer("pointerup", 75, true);
    expect(last()).toBeCloseTo(52.5, 6);
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

  it("resets to default on double-click of the body", async () => {
    await mount(20);
    await act(async () => {
      slider().dispatchEvent(
        new MouseEvent("dblclick", { bubbles: true, cancelable: true }),
      );
    });
    expect(last()).toBe(50);
  });

  it("a press without drag on the body does nothing (no change, no editor)", async () => {
    await mount(50);
    await pointer("pointerdown", 100);
    await pointer("pointerup", 100); // released below the drag threshold
    expect(recorded.changes).toHaveLength(0);
    expect(container?.querySelector("input")).toBeNull();
  });

  it("resets to default on Enter and on Space", async () => {
    await mount(20);
    await keydown("Enter");
    expect(last()).toBe(50);
    await keydown(" ");
    expect(last()).toBe(50);
    // No keyboard path opens the type-in editor on a knob.
    expect(container?.querySelector("input")).toBeNull();
  });

  it("steps by keyStep on arrows and keyStepLarge on Page", async () => {
    await mount(50);
    await keydown("ArrowUp"); // +0.01 pos -> +1 -> 51
    expect(last()).toBeCloseTo(51, 6);
    await keydown("PageUp"); // +0.1 pos -> +10 -> 61
    expect(last()).toBeCloseTo(61, 6);
  });

  it("jumps to endpoints on Home / End", async () => {
    await mount(50);
    await keydown("End");
    expect(last()).toBe(100);
    await keydown("Home");
    expect(last()).toBe(0);
  });

  it("exposes the display string as aria-valuetext, not the raw number", async () => {
    await mount(42);
    expect(slider().getAttribute("aria-valuetext")).toBe("42 u");
    expect(slider().getAttribute("aria-valuenow")).toBe("42");
    expect(slider().getAttribute("role")).toBe("slider");
  });

  it("accepts type-in entry opened by a double-click on the label", async () => {
    await mount(50);
    // A double-click on the caption label opens the type-in editor.
    await act(async () => {
      label().dispatchEvent(
        new MouseEvent("dblclick", { bubbles: true, cancelable: true }),
      );
    });
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
