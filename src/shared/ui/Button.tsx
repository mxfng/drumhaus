import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "transition-all duration-200 cursor-pointer flex items-center justify-center w-full focus-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary hover:bg-primary-muted rounded-tl-lg rounded-br-lg text-primary-foreground",
        secondary: "hover:text-foreground-muted",
        hardware:
          "neu-raised text-foreground group hover:text-primary-muted font-light border-border border rounded-lg",
        hardwareIcon:
          "surface-raised text-foreground group hover:text-primary-muted font-light border-border border rounded-full aspect-square",
      },
      size: {
        icon: "h-8 w-8",
        xs: "h-8 text-sm",
        sm: "h-10 text-sm",
        default: "h-12",
        lg: "h-16",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
