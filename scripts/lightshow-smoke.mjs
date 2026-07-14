/**
 * Cold-load lightshow smoke check (issue #330).
 *
 * Serves the production build, then drives a dedicated headless Chromium
 * via CDP simulating a first-ever visit on a mid-tier connection: HTTP
 * cache disabled, ~4Mbps / 60ms RTT network, 4x CPU throttling. Asserts
 * that the intro wave plays, is never stomped by the safety reveal, runs
 * to completion, and holds a sane frame cadence.
 *
 * Requires `pnpm build` first (CI runs it right after the build step).
 * Usage: pnpm smoke:lightshow
 */
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 4517;
const URL_UNDER_TEST = `http://localhost:${PORT}/`;
const CPU_RATE = 4;
const NET = {
  offline: false,
  latency: 60,
  downloadThroughput: (4 * 1024 * 1024) / 8,
  uploadThroughput: (1 * 1024 * 1024) / 8,
};
// The wave sweeps on and off over ~1.2s; anything much shorter means it was
// cut off mid-flight.
const MIN_WAVE_DURATION_MS = 1000;
const MAX_MEDIAN_FRAME_MS = 33;

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`preview server did not come up at ${url}`);
}

const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? "  ok " : "FAIL "} ${message}`);
  if (!ok) failures.push(message);
};

const server = spawn(
  "pnpm",
  ["exec", "vite", "preview", "--port", String(PORT), "--strictPort"],
  { stdio: "ignore" },
);

let browser;
try {
  await waitForServer(URL_UNDER_TEST);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // In-page instrumentation: rAF cadence + lightshow lifecycle marks.
  await page.addInitScript(() => {
    window.__frames = [];
    window.__lightChanges = [];
    window.__marks = {};
    const loop = (t) => {
      window.__frames.push(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    const mark = (name) => {
      if (window.__marks[name] === undefined)
        window.__marks[name] = performance.now();
    };
    const observer = new MutationObserver((mutations) => {
      const now = performance.now();
      for (const m of mutations) {
        if (m.attributeName === "data-light-state") {
          window.__lightChanges.push(now);
          if (m.target.getAttribute("data-light-state") === "on")
            mark("waveFirstOn");
        } else if (
          m.attributeName === "data-light-node" &&
          m.target.getAttribute("data-light-node") === "done"
        ) {
          mark("reveal");
        }
      }
    });
    const attach = () =>
      observer.observe(document.documentElement, {
        attributes: true,
        subtree: true,
        attributeFilter: ["data-light-state", "data-light-node"],
      });
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", attach);
    else attach();
  });

  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", NET);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_RATE });

  await page.goto(URL_UNDER_TEST, { waitUntil: "commit" });

  // Wait until revealed and the lights have been quiet for 2s.
  await page.waitForFunction(
    () => {
      const lc = window.__lightChanges;
      return (
        window.__marks.reveal !== undefined &&
        (lc.length === 0 || performance.now() - lc[lc.length - 1] > 2000)
      );
    },
    null,
    { timeout: 60000 },
  );

  const { frames, lightChanges, marks } = await page.evaluate(() => ({
    frames: window.__frames,
    lightChanges: window.__lightChanges,
    marks: window.__marks,
  }));

  const { waveFirstOn, reveal } = marks;
  const lastChange = lightChanges.at(-1);

  console.log(
    `wave start ${waveFirstOn?.toFixed(0)}ms, wave end ${lastChange?.toFixed(0)}ms, reveal ${reveal?.toFixed(0)}ms`,
  );

  check(waveFirstOn !== undefined, "intro wave played");
  if (waveFirstOn !== undefined) {
    check(
      reveal >= waveFirstOn,
      `reveal (${reveal?.toFixed(0)}ms) did not fire before the wave (${waveFirstOn.toFixed(0)}ms)`,
    );
    check(
      lastChange - waveFirstOn >= MIN_WAVE_DURATION_MS,
      `wave ran to completion (${(lastChange - waveFirstOn).toFixed(0)}ms >= ${MIN_WAVE_DURATION_MS}ms)`,
    );

    const waveDeltas = [];
    for (let i = 1; i < frames.length; i++) {
      if (frames[i] >= waveFirstOn && frames[i] <= lastChange)
        waveDeltas.push(frames[i] - frames[i - 1]);
    }
    waveDeltas.sort((a, b) => a - b);
    const median = waveDeltas[Math.floor(waveDeltas.length / 2)] ?? Infinity;
    const max = waveDeltas.at(-1) ?? Infinity;
    console.log(
      `wave frames: ${waveDeltas.length}, median ${median.toFixed(1)}ms, max ${max.toFixed(1)}ms`,
    );
    check(
      median <= MAX_MEDIAN_FRAME_MS,
      `median wave frame ${median.toFixed(1)}ms <= ${MAX_MEDIAN_FRAME_MS}ms`,
    );
  }
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}

if (failures.length > 0) {
  console.error(`\nlightshow smoke check FAILED (${failures.length})`);
  process.exit(1);
}
console.log("\nlightshow smoke check passed");
