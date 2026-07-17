/**
 * Whether this tab is currently linked to the shared haus session.
 *
 * A leaf module that imports nothing, so feature stores can consult the
 * linked state without importing the session adapter (which imports the
 * stores back - a cycle). Written only by the adapter's link()/unlink();
 * everything else is read-only.
 *
 * The consumer that motivates this: while linked, the transport store's
 * togglePlay must NOT start the engine immediately - the session adapter
 * owns starting playback, aligned to the shared grid's downbeat. An
 * immediate start would audibly misfire ahead of the downbeat and then be
 * restarted onto the grid (the double-fire stutter of issue #425).
 */

let sessionLinked = false;

/** Adapter-only mutator; see module doc. */
function setSessionLinked(linked: boolean): void {
  sessionLinked = linked;
}

function isSessionLinked(): boolean {
  return sessionLinked;
}

export { isSessionLinked, setSessionLinked };
