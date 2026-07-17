import { useEffect } from "react";

import { useToast } from "@/shared/ui";
import { onKitLoadFailure } from "./kit-subscription";

/**
 * Toasts kit-load failures. Subscribes to the bridge's kit-load-failure
 * event (fired after the instruments store rolled back to the kit the
 * engine still holds, decision 5 in docs/preset-persistence.md) and tells
 * the user their kit change did not take. Mounted alongside the engine
 * bridge in DrumhausProvider.
 */
function useKitLoadFailureToast(): void {
  const { toast } = useToast();

  useEffect(
    () =>
      onKitLoadFailure(() => {
        toast({
          title: "Kit Failed to Load",
          description:
            "The kit's samples could not be loaded, so the previous kit is still active.",
          status: "error",
          duration: 6000,
        });
      }),
    [toast],
  );
}

export { useKitLoadFailureToast };
