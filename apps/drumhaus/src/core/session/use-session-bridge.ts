import { useEffect } from "react";

import { getSessionAdapter } from "./session-adapter";

/**
 * The session bridge's lifecycle hook, mounted alongside use-engine-bridge
 * (DrumhausProvider). Link/unlink themselves are user gestures on the LINK
 * control; this hook only guarantees the session is left when the page
 * goes away - pagehide covers close, navigation, and bfcache entry, so
 * peers drop this tab immediately (the goodbye message) instead of waiting
 * out the heartbeat timeout, and a tab restored from bfcache is not
 * silently rejoined (LINK is an explicit per-visit gesture). Conductorship
 * needs no handling here: the browser releases the Web Lock when the page
 * goes away.
 */
function useSessionBridge(): void {
  useEffect(() => {
    // LINK ships dark: with the build-time flag off this hook is a no-op
    // and no session objects are ever created (the whole session graph
    // dead-code-eliminates out of the bundle).
    if (!__ENABLE_LINK__) return;
    const adapter = getSessionAdapter();

    const handlePageHide = () => {
      adapter.unlink();
    };
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      adapter.unlink();
    };
  }, []);
}

export { useSessionBridge };
