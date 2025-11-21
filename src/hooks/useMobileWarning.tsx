import { useState } from "react";

interface UseMobileWarningResult {
  isMobileWarning: boolean;
  setIsMobileWarning: (value: boolean) => void;
}

// Check if running in browser and detect mobile device
const getInitialMobileState = () => {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
};

export function useMobileWarning(): UseMobileWarningResult {
  const [isMobileWarning, setIsMobileWarning] = useState(getInitialMobileState);

  return {
    isMobileWarning,
    setIsMobileWarning,
  };
}
