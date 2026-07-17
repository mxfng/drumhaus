/**
 * Whether a local continuous bpm gesture (a knob drag or an open value
 * edit) is in progress.
 *
 * A leaf module like link-state.ts, so the transport controls can report
 * their param-control gesture brackets without importing the session
 * adapter (and without pulling the session graph into builds that compile
 * LINK out). The transport UI writes; the session adapter reads.
 *
 * The consumer that motivates this: while a follower drags the bpm knob,
 * every conductor state broadcast carries the last-ACKED tempo, so
 * applying it inbound would snap the store back per broadcast until the
 * final intent lands - the drag-fights-acks jitter of issue #424. The
 * adapter suppresses inbound bpm while a gesture is open and observes the
 * gesture end to reconcile.
 */

let depth = 0;
const endListeners = new Set<() => void>();

/** Bracket open. Callers must pair every begin with exactly one end. */
function beginBpmGesture(): void {
  depth += 1;
}

function endBpmGesture(): void {
  if (depth === 0) return;
  depth -= 1;
  if (depth === 0) {
    endListeners.forEach((listener) => listener());
  }
}

function isBpmGestureActive(): boolean {
  return depth > 0;
}

/** Observe the last open gesture ending; returns an unsubscriber. */
function onBpmGestureEnd(listener: () => void): () => void {
  endListeners.add(listener);
  return () => {
    endListeners.delete(listener);
  };
}

export { beginBpmGesture, endBpmGesture, isBpmGestureActive, onBpmGestureEnd };
