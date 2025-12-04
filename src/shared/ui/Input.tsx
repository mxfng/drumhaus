import { forwardRef } from "react";

import { cn } from "@/shared/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      data-allow-selection
      className={cn(
        "font-pixel placeholder:text-foreground-muted selection:bg-primary/50 bg-screen text-screen-foreground h-10 w-full rounded-lg border px-4",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";
