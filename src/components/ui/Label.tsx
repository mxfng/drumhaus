import { forwardRef } from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva("text-xs", {
  variants: {
    variant: {
      default: "text-foreground-muted",
      outline:
        "inline-flex items-center justify-center rounded-full bg-primary/10 text-foreground px-2.5 py-1 text-xs font-medium",
    },
  },
});

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {}

export const Label = forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root> &
    React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants({ variant: "default" }), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

// TODO: replace all label usage with this component
