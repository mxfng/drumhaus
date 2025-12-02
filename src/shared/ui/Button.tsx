import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer flex items-center justify-center w-full p-1.5",
  {
    variants: {
      variant: {
        primary:
          "bg-primary hover:bg-primary-muted rounded-tl-lg rounded-br-lg text-primary-foreground",
        secondary: "hover:text-foreground-muted",
        hardware:
          "surface-raised text-foreground group hover:text-primary-muted font-light border-border border rounded-lg",
        hardwareIcon:
          "surface-raised text-foreground group hover:text-primary-muted font-light border-border border rounded-full aspect-square",
      },
      size: {
        icon: "h-6 w-6",
        xs: "h-10 sm:h-6 text-sm",
        sm: "h-12 sm:h-8 text-sm",
        default: "h-14 sm:h-10",
        lg: "sm:h-[140px] text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
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
