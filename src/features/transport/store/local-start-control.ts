/**
 * Whether an external owner currently controls starting the transport, so
 * togglePlay must not start the engine locally.
 *
 * A leaf module that imports nothing, so the transport store can consult it
 * without importing whatever owns playback start (which imports the store
 * back - a cycle). Default false: fully local playback. The only writer
 * today is the Jam session adapter, which sets it while linked so playback
 * starts aligned to the shared grid's downbeat instead of immediately - an
 * immediate start would audibly misfire ahead of the downbeat and then be
 * restarted onto the grid (the double-fire stutter of issue #425).
 *
 * When no such owner exists (the standalone build, where the Jam layer is
 * absent) nothing writes this and it stays false, so togglePlay always
 * starts locally. Lives in the transport feature, not the Jam layer, so the
 * transport store never imports Jam code.
 */

let localStartSuppressed = false;

/** Owner-only mutator; see module doc. */
function setLocalStartSuppressed(suppressed: boolean): void {
  localStartSuppressed = suppressed;
}

function isLocalStartSuppressed(): boolean {
  return localStartSuppressed;
}

export { isLocalStartSuppressed, setLocalStartSuppressed };
