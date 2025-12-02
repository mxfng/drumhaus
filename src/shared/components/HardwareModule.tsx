import { forwardRef } from "react";

import { cn } from "@/shared/lib/utils";

/* HardwareModule Root */
export function HardwareModule({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex w-full flex-col gap-2", className)} {...props} />
  );
}

/* HardwareModule Label */
export const HardwareModuleLabel = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex h-4 w-full items-center justify-center", className)}
    {...props}
  >
    <mark className="bg-foreground-muted text-surface rounded px-2 text-xs">
      {children}
    </mark>
  </div>
));
HardwareModuleLabel.displayName = "HardwareModuleLabel";

/* HardwareModule Spacer */
export function HardwareModuleSpacer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-4", className)} {...props} />;
}
