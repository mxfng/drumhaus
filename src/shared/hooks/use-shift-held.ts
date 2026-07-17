import { useEffect, useState } from "react";

/**
 * Tracks whether the Shift key is currently held, resetting on window blur
 * (a Shift held across a focus switch would otherwise stick "on"). Drives
 * modifier-flipped hardware controls like the undo/redo button.
 */
function useShiftHeld(): boolean {
  const [isShiftHeld, setIsShiftHeld] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") setIsShiftHeld(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") setIsShiftHeld(false);
    };
    const reset = () => setIsShiftHeld(false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return isShiftHeld;
}

export { useShiftHeld };
