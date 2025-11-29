import { forwardRef } from "react";

import { cn } from "@/shared/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "font-pixel placeholder:text-foreground-muted/60 selection:bg-primary/50 h-10 w-full rounded-lg bg-transparent px-4 shadow-[inset_0_2px_8px_var(--color-shadow-60)] outline-none",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";
