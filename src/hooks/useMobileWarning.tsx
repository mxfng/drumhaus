import { useEffect, useState } from "react";

interface UseMobileWarningResult {
  isMobileWarning: boolean;
  setIsMobileWarning: (value: boolean) => void;
}

export function useMobileWarning(): UseMobileWarningResult {
  const [isMobileWarning, setIsMobileWarning] = useState(false);

  // Mobile device warning
  useEffect(() => {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    if (isMobile) {
      setIsMobileWarning(true);
    }
  }, []);

  return {
    isMobileWarning,
    setIsMobileWarning,
  };
}
