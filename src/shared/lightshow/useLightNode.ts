import { useEffect } from "react";

import { useLightRig } from "./LightRigContext";
import { LightNodeRegistration } from "./types";

export const useLightNode = (
  ref: React.RefObject<HTMLElement | null>,
  options?: Omit<LightNodeRegistration, "ref">,
) => {
  const { registerNode } = useLightRig();

  const { id, group, glowColor, weight } = options ?? {};

  useEffect(() => {
    if (!ref.current) return;

    const unregister = registerNode({
      id,
      group,
      glowColor,
      weight,
      ref,
    });

    return unregister;
  }, [registerNode, ref, id, group, glowColor, weight]);
};
