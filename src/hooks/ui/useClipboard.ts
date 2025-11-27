import { useCallback, useState } from "react";

interface UseClipboardOptions {
  timeout?: number;
}

export function useClipboard(options: UseClipboardOptions = {}) {
  const { timeout = 2000 } = options;
  const [hasCopied, setHasCopied] = useState(false);

  const onCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setHasCopied(true);

        setTimeout(() => {
          setHasCopied(false);
        }, timeout);
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        setHasCopied(false);
      }
    },
    [timeout],
  );

  return { onCopy, hasCopied };
}
