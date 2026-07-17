import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Cross-app playback ALIGNMENT (issue #425): drumhaus and pulse must place
 * their beat onsets on the same shared-grid instants, not merely both be
 * "playing". This spec is the automated ear.
 *
 * How it measures: an init script in every page patches
 * OscillatorNode.start / AudioBufferSourceNode.start to record each
 * scheduled onset, mapped to shared epoch time with the node's own
 * context's getOutputTimestamp anchor - the same mapping
 * packages/bridge/src/clock.ts uses (contextTimeToEpochMs), so the numbers
 * are speaker-time, comparable across pages. The session's grid
 * (startEpochMs, bpm) is captured off the BroadcastChannel state
 * broadcasts. Pulse's metronome clicks give the reference beat grid;
 * drumhaus is measured against it.
 *
 * Asserted for both start-from-drumhaus and start-from-pulse:
 * - at least MIN_ALIGNED_BEATS consecutive beats where the two apps'
 *   onsets agree within TOLERANCE_MS, and
 * - no drumhaus double-fire: no scheduled hit audibly ahead of the shared
 *   downbeat (the "misfire then restart" stutter of #425).
 */

/** Cross-app onset agreement tolerance. Musically tight, not sample-locked. */
const TOLERANCE_MS = 10;

/** Minimum consecutive aligned beats each scenario must produce. */
const MIN_ALIGNED_BEATS = 8;

/** Beats measured: 8 asserted plus margin for scheduling to settle. */
const PLAY_MS = 6_000;

interface CapturedOnset {
  kind: "osc" | "buffer";
  /** start()'s `when` argument; null when called with no argument. */
  rawWhen: number | null;
  /** Resolved schedule time on the node's own context (seconds). */
  contextWhen: number;
  /** The context's currentTime at the start() call (seconds). */
  currentTime: number;
  /** contextWhen mapped to shared epoch ms via getOutputTimestamp. */
  epochMs: number;
}

interface CapturedState {
  state: { playing: boolean; bpm: number; startEpochMs: number | null };
}

declare global {
  interface Window {
    __onsets: CapturedOnset[];
    __sessionStates: CapturedState[];
  }
}

/**
 * Injected before any app code: records every scheduled source start with
 * an epoch mapping anchored by that context's getOutputTimestamp (falling
 * back to currentTime exactly like the bridge clock), and spies session
 * state broadcasts off the haus BroadcastChannel.
 */
const ONSET_CAPTURE_INIT = `(() => {
  const onsets = [];
  window.__onsets = onsets;
  const anchorOf = (ctx) => {
    const ts = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
    if (
      ts &&
      typeof ts.contextTime === "number" &&
      typeof ts.performanceTime === "number" &&
      (ts.contextTime !== 0 || ts.performanceTime !== 0)
    ) {
      return { c: ts.contextTime, e: performance.timeOrigin + ts.performanceTime };
    }
    return { c: ctx.currentTime, e: performance.timeOrigin + performance.now() };
  };
  const patch = (Ctor, kind) => {
    const orig = Ctor.prototype.start;
    Ctor.prototype.start = function (when, ...rest) {
      try {
        const ctx = this.context;
        const contextWhen = Math.max(when ?? 0, ctx.currentTime);
        const a = anchorOf(ctx);
        onsets.push({
          kind,
          rawWhen: when === undefined ? null : when,
          contextWhen,
          currentTime: ctx.currentTime,
          epochMs: a.e + (contextWhen - a.c) * 1000,
        });
      } catch {}
      return orig.call(this, when, ...rest);
    };
  };
  patch(OscillatorNode, "osc");
  patch(AudioBufferSourceNode, "buffer");

  window.__sessionStates = [];
  const OrigBC = window.BroadcastChannel;
  const record = (state) => {
    window.__sessionStates.push({ state });
  };
  window.BroadcastChannel = function (name) {
    const bc = new OrigBC(name);
    if (name === "haus-session") {
      const spy = new OrigBC(name);
      spy.onmessage = (ev) => {
        const d = ev.data;
        if (d && d.type === "state") record(d.state);
      };
      const origPost = bc.postMessage.bind(bc);
      bc.postMessage = (msg) => {
        if (msg && msg.type === "state") record(msg.state);
        return origPost(msg);
      };
    }
    return bc;
  };
  window.BroadcastChannel.prototype = OrigBC.prototype;
})();`;

// --- page drivers (selectors mirror drumhaus-pulse.spec.ts) ---

async function openDrumhaus(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/");
  for (let i = 0; i < 8; i++) {
    await expect(
      page.locator(`[data-instrument-index="${i}"] button`).first(),
    ).toBeEnabled({ timeout: 20_000 });
  }
  await expect(page.locator('[data-light-node="done"]').first()).toBeAttached({
    timeout: 15_000,
  });
  return page;
}

async function openPulse(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/pulse/");
  await expect(page.getByRole("heading", { name: "pulse" })).toBeVisible();
  // Any pointerdown creates pulse's AudioContext; without it the metronome
  // cannot sound when playback starts from the other app.
  await page.locator("h1").click();
  return page;
}

async function enableLink(page: Page): Promise<void> {
  await page.getByRole("button", { name: "LINK", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "LINK", exact: true }),
  ).toHaveAttribute("data-linked", "true");
}

/**
 * Program hits on every beat (steps 0, 4, 8, 12) of the selected voice so
 * drumhaus produces a transient on each quarter note, comparable to
 * pulse's metronome clicks.
 */
async function programBeats(page: Page): Promise<void> {
  for (const index of [0, 4, 8, 12]) {
    const step = page.locator(`button[data-step-index="${index}"]`);
    await step.click();
    await expect(step).toHaveAttribute("data-active", "true");
  }
}

// --- measurement ---

interface PageCapture {
  onsets: CapturedOnset[];
  states: CapturedState[];
}

function capture(page: Page): Promise<PageCapture> {
  return page.evaluate(() => ({
    onsets: window.__onsets,
    states: window.__sessionStates,
  }));
}

/**
 * Onsets genuinely scheduled ahead on a running context: filters the
 * context-unlock blips (start() with no argument) and library
 * feature-detection calls (start(0) on fresh offline contexts).
 */
function scheduledOnsets(onsets: CapturedOnset[]): CapturedOnset[] {
  return onsets.filter(
    (onset) =>
      onset.rawWhen !== null && onset.contextWhen > onset.currentTime + 0.02,
  );
}

/** The grid both apps agreed to play on (last playing state broadcast). */
function sessionGrid(...captures: PageCapture[]): {
  startEpochMs: number;
  beatMs: number;
} {
  const playing = captures
    .flatMap((c) => c.states)
    .filter((s) => s.state.playing && s.state.startEpochMs !== null);
  expect(playing.length).toBeGreaterThan(0);
  const grid = playing[playing.length - 1].state;
  return { startEpochMs: grid.startEpochMs!, beatMs: 60_000 / grid.bpm };
}

/**
 * Assert cross-app agreement: for each pulse click (the reference beat
 * grid), the nearest scheduled drumhaus onset must land within
 * TOLERANCE_MS, for at least MIN_ALIGNED_BEATS consecutive beats.
 */
function expectAligned(drumhaus: PageCapture, pulse: PageCapture): void {
  const { startEpochMs, beatMs } = sessionGrid(drumhaus, pulse);
  const clicks = scheduledOnsets(pulse.onsets).filter((o) => o.kind === "osc");
  const hits = scheduledOnsets(drumhaus.onsets).filter(
    (o) => o.kind === "buffer",
  );
  expect(clicks.length).toBeGreaterThanOrEqual(MIN_ALIGNED_BEATS);
  expect(hits.length).toBeGreaterThanOrEqual(MIN_ALIGNED_BEATS);

  // Offset per beat index, where a beat is aligned when the nearest
  // drumhaus onset to the pulse click is within tolerance.
  const alignedBeats = new Set<number>();
  const offsets: string[] = [];
  for (const click of clicks) {
    const beat = Math.round((click.epochMs - startEpochMs) / beatMs);
    let nearest = Infinity;
    for (const hit of hits) {
      const delta = hit.epochMs - click.epochMs;
      if (Math.abs(delta) < Math.abs(nearest)) nearest = delta;
    }
    offsets.push(`beat ${beat}: ${nearest.toFixed(2)}ms`);
    if (Math.abs(nearest) <= TOLERANCE_MS) alignedBeats.add(beat);
  }

  let longestRun = 0;
  let run = 0;
  const maxBeat = Math.max(...alignedBeats, 0);
  for (let beat = 0; beat <= maxBeat; beat++) {
    run = alignedBeats.has(beat) ? run + 1 : 0;
    longestRun = Math.max(longestRun, run);
  }

  expect
    .soft(longestRun, `per-beat offsets:\n${offsets.join("\n")}`)
    .toBeGreaterThanOrEqual(MIN_ALIGNED_BEATS);

  // No double-fire: nothing from drumhaus may sound audibly ahead of the
  // shared downbeat (the immediate unaligned start's misfire).
  const misfires = hits.filter(
    (hit) =>
      hit.epochMs < startEpochMs - TOLERANCE_MS &&
      hit.epochMs > startEpochMs - beatMs,
  );
  expect(
    misfires.map((hit) => `${(hit.epochMs - startEpochMs).toFixed(2)}ms`),
  ).toEqual([]);
}

// --- scenarios ---

test.describe("cross-app beat alignment", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(ONSET_CAPTURE_INIT);
  });

  test("starting from drumhaus, both apps sound the same beats", async ({
    context,
  }) => {
    const drumhaus = await openDrumhaus(context);
    await programBeats(drumhaus);
    const pulse = await openPulse(context);
    await enableLink(drumhaus);

    await drumhaus.getByRole("button", { name: "Play", exact: true }).click();
    await expect(
      drumhaus.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();
    await drumhaus.waitForTimeout(PLAY_MS);

    expectAligned(await capture(drumhaus), await capture(pulse));
  });

  test("starting from pulse, both apps sound the same beats", async ({
    context,
  }) => {
    const drumhaus = await openDrumhaus(context);
    await programBeats(drumhaus);
    const pulse = await openPulse(context);
    await enableLink(drumhaus);

    await pulse.getByRole("button", { name: "play", exact: true }).click();
    await expect(
      drumhaus.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();
    await pulse.waitForTimeout(PLAY_MS);

    expectAligned(await capture(drumhaus), await capture(pulse));
  });
});
