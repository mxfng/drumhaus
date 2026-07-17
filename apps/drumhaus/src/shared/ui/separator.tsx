import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cva, VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

const separatorVariants = cva(
  "shrink-0  data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full ",
  {
    variants: {
      variant: {
        default:
          "bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:w-px",
        neumorphic:
          "w-full shadow-[inset_2px_1px_2px_0_var(--color-shadow-30)] data-[orientation=horizontal]:h-1 data-[orientation=vertical]:w-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Separator({
  className,
  orientation = "horizontal",
  variant = "default",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> &
  VariantProps<typeof separatorVariants>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(separatorVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Separator };
