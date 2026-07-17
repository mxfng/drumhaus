# @haus/bridge

Serverless cross-instrument session sync for the instrument family.
A framework-free, zero-runtime-dependency TypeScript library that lets multiple browser instruments open on the same origin share a musical session: tempo, transport, and scene.
This README is the protocol's document of record (protocol v1).

## Summary

Instruments in different tabs join one session over a `BroadcastChannel`.
One tab, elected via the Web Locks API, is the conductor and owns the session state; everyone else follows.
The session's musical grid is fully determined by `(startEpochMs, bpm)`: no position or phase messages exist, every tab derives the grid deterministically from the shared epoch clock and self-corrects locally.

```ts
import { createSession, epochToContextTime } from "@haus/bridge";

const session = createSession({ instrument: "drumhaus" });
session.connect();

session.onStateChange((state) => {
  if (state.playing && state.startEpochMs !== null) {
    // Schedule bar 0 beat 0 on your own AudioContext.
    const downbeat = epochToContextTime(audioContext, state.startEpochMs);
    engine.startAt(downbeat, state.bpm);
  } else {
    engine.stop();
  }
});

session.play(); // any peer may request; the conductor applies
session.setBpm(150);
session.setScene(2);
session.disconnect();
```

## Timing model

### The shared epoch clock

Every peer reads the same clock:

```
epochNowMs() = performance.timeOrigin + performance.now()
```

Same-machine, same-browser tabs agree on this clock to about 1ms, which is what makes a purely derived grid possible.
This is also the session boundary: the protocol only works where that clock (and `BroadcastChannel`, and Web Locks) is shared, i.e. same origin, same browser, same machine.

### The grid

The session is fixed 4/4 in v1: one bar is four beats at the session bpm.
This is deliberate and carries no protocol field; a future protocol version would add one.

Given `SessionState`:

```ts
{
  rev: number; // conductor-owned revision counter
  bpm: number; // clamped to [40, 300]
  playing: boolean;
  startEpochMs: number | null; // epoch instant of bar 0 beat 0; null when stopped
  scene: 0 | 1 | 2 | 3;
}
```

the grid is:

```
beatMs(bpm)  = 60000 / bpm
barMs(bpm)   = 4 * beatMs(bpm)
beats(t)     = (t - startEpochMs) / beatMs(bpm)
bars(t)      = beats(t) / 4
```

`playing` and `startEpochMs` are always consistent: a derivable grid exists exactly while playing, and messages violating that invariant are rejected as malformed.

### Play and stop

On play, the conductor sets `startEpochMs = epochNowMs() + START_LEAD_MS` (200ms of lead), so every tab receives the state and schedules the downbeat ahead of time.
`beats(t)` is negative during the lead window; it is a count-in.
On stop, `playing = false` and `startEpochMs = null`.

### Tempo change while playing

The conductor rebases the grid so the beat position at the decision instant `t` is identical under both tempos:

```
B            = (t - startEpochMs) / beatMs(oldBpm)   // beats elapsed at t
startEpochMs' = t - B * beatMs(newBpm)
```

The change is immediate, not bar-quantized; phase is continuous, so followers glide to the new rate without a jump.
While stopped, a tempo change just sets `bpm`.

### Scene

`scene` is a bare index 0-3.
Its semantics (which pattern, which kit, which anything) belong to each instrument, not to the protocol.

### AudioContext mapping

Instruments schedule on their own `AudioContext`, so the library maps between epoch time and context time:

```
epochToContextTime(ctx, epochMs)  -> seconds on ctx's clock
contextTimeToEpochMs(ctx, s)      -> epoch milliseconds
```

The mapping anchors on `ctx.getOutputTimestamp()`, which pairs a context time with the `performance.now()` instant at which that audio reaches the output, so epoch-scheduled events line up at the speaker.
Fallback: when `getOutputTimestamp` is unavailable (older WebKit) or returns zeros (a context that has not produced output yet, e.g. suspended), the anchor is `ctx.currentTime` sampled against the epoch clock directly.
The fallback ignores output latency but stays within a few milliseconds, consistent with the library's contract below.

## Roles and election

Conductor election uses the Web Locks API: every connected peer requests the `haus:conductor` lock and holds it for the session instance's lifetime once granted.
The lock holder is the conductor.
On tab close, crash, or navigation, the browser releases the lock and the next waiter is granted it, with no protocol traffic involved.
On acquiring conductorship, the new conductor rebroadcasts the last-seen state with the same `rev`, so late joiners and peers in the handover window converge on its view.

A solo tab acquires the lock immediately and is its own conductor; the library is near-zero-cost in this mode (one heartbeat broadcast every 2s).

Web Locks are same-origin, per-browser, per-machine - the same boundary as the rest of the protocol - and require a secure context.
Supported in Chrome 69+, Edge 79+, Firefox 96+, and Safari 15.4+.
If the API is missing entirely, the election degrades to each tab conducting itself; cross-tab conductor dedup requires Web Locks.

## Messages

All messages travel on one `BroadcastChannel` (`haus-session`) with the envelope `{ v: 1, type, from: peerId, ... }`.
Peer identity is a random id per session instance (`crypto.randomUUID`), plus a caller-provided `{ instrument, label? }` descriptor.

| type        | sender    | payload  | purpose                                                                        |
| ----------- | --------- | -------- | ------------------------------------------------------------------------------ |
| `hello`     | any       | `peer`   | announce joining; peers reply with `heartbeat`, the conductor replies `state`  |
| `heartbeat` | any       | `peer`   | liveness, every 2000ms; peers are dropped after 5500ms of silence              |
| `intent`    | any       | `intent` | request `setBpm` \| `play` \| `stop` \| `setScene`; only the conductor applies |
| `state`     | conductor | `state`  | the full `SessionState`; followers adopt it when `rev >=` their local `rev`    |
| `goodbye`   | any       | -        | leave immediately, without waiting for the timeout                             |

Rules:

- The conductor bumps `rev` on every change it applies (its own commands and accepted intents) and broadcasts the full state.
- Followers never self-apply; their commands become intents and take effect when the conductor's state comes back.
- The `rev >= local rev` guard makes duplicate and handover-window rebroadcasts harmless.
- Messages that are not well-formed protocol v1 (`v !== 1`, unknown type, malformed payload, out-of-range values) are rejected defensively; peers speaking a future protocol version may share the channel someday.

### Handover semantics

Conductorship transfer is not atomic: between the old conductor releasing the lock and the new one acquiring it, intents have no one to apply them.
Intents arriving in that window may be lost.
This is an accepted v1 tradeoff: intents are user gestures (a knob turn, a play press) and the user simply repeats one in the rare case it lands in a handover.

## v1 boundaries

These are design decisions, not omissions:

- **Same origin only.** The transport, the election, and the epoch clock are all same-origin, same-browser, same-machine. Nothing crosses the network.
- **Fixed 4/4.** No time-signature field exists in v1.
- **No swing in the protocol.** Swing is instrument-local feel by design: the session shares the straight grid, and each instrument applies its own groove against it.
- **Musically tight, not sample-locked.** The epoch clock aligns tabs to about a millisecond, which is tight enough to feel like one instrument. Sample-accurate cross-tab alignment is out of scope; each instrument owns its own AudioContext.
- **Scene semantics are instrument-owned.** The protocol moves an index, nothing more.
- **Intents may be lost during a conductor handover** (see above).

## Package layout

| module         | contents                                                                       |
| -------------- | ------------------------------------------------------------------------------ |
| `types.ts`     | protocol types, constants, and the defensive envelope parser                   |
| `clock.ts`     | pure grid math, tempo rebase, epoch and AudioContext time mapping              |
| `transport.ts` | the `BridgeTransport` seam: `broadcastChannelTransport`, `memoryHub` for tests |
| `election.ts`  | conductor election over Web Locks                                              |
| `session.ts`   | `createSession`, the facade wiring all of the above together                   |

`createSession({ instrument, label?, transport?, now?, locks? })` accepts injectable transport, clock, and locks, so the whole session is deterministic under test; the defaults are the real `BroadcastChannel`, `epochNowMs`, and `navigator.locks`.

## Testing

`pnpm test` runs two vitest projects: pure node tests for grid math, reducer logic, envelope validation, election, and peer bookkeeping, and browser-mode tests (real Chromium via Playwright) where multiple sessions in one page converge over a real `BroadcastChannel` and hand off conductorship over real Web Locks.
