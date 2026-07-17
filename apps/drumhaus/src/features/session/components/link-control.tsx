import { useSession } from "@haus/bridge-react";

import { getSessionAdapter } from "@/core/session/session-adapter";
import { cn } from "@/shared/lib/utils";

/**
 * The floating LINK control: opt this tab into the shared session
 * (#417). Lives on the window edge in the floating-menu family - never on
 * the hardware chassis - fixed next to the menu button with the same
 * circular, bordered, backdrop-blurred idiom. Filled while linked, with
 * the peer count as a bare number and a dot while this tab conducts.
 *
 * Reads the shared session snapshot through @haus/bridge-react's headless
 * hook; the toggle routes through the drumhaus session adapter, which owns
 * the seed-then-connect handshake. Earmarked for extraction to a shared UI
 * package once the design tokens are extracted (sprint 2).
 */
function LinkControl() {
  const adapter = getSessionAdapter();
  const { linked, peers, isConductor } = useSession(adapter.controller);

  return (
    <button
      aria-label="LINK"
      data-linked={linked}
      data-peers={linked ? peers.length : undefined}
      data-conductor={linked && isConductor}
      onClick={() => (linked ? adapter.unlink() : adapter.link())}
      className={cn(
        "border-primary focus-ring fixed top-2 left-14 z-50 flex h-10 min-w-10 cursor-pointer items-center justify-center gap-1.5 rounded-full border-2 px-3 backdrop-blur-xl transition-all duration-500",
        linked
          ? "bg-primary text-primary-foreground hover:bg-primary/85"
          : "text-primary hover:bg-accent/20 bg-transparent",
      )}
    >
      <span className="text-xs font-medium tracking-widest">LINK</span>
      {linked && (
        <span className="text-xs font-medium tabular-nums">{peers.length}</span>
      )}
      {linked && isConductor && (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      )}
    </button>
  );
}

export { LinkControl };
