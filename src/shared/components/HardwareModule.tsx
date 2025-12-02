import { forwardRef } from "react";
import { cva, VariantProps } from "class-variance-authority";

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

const hardwareModuleLabelVariants = cva(
  " rounded px-2 text-xs inline-flex items-center justify-center gap-1",
  {
    variants: {
      variant: {
        default: "bg-foreground-muted text-surface",
        outline: "border border-foreground bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/* HardwareModule Label */
export const HardwareModuleLabel = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof hardwareModuleLabelVariants>
>(({ className, children, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex h-4 w-full items-center justify-center", className)}
    {...props}
  >
    <mark className={hardwareModuleLabelVariants({ variant })}>{children}</mark>
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
