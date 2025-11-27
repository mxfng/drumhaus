import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer flex items-center justify-center w-full",
  {
    variants: {
      variant: {
        primary:
          "bg-primary hover:bg-primary-muted rounded-tl-lg rounded-br-lg text-primary-foreground",
        secondary: "hover:text-foreground-muted",
        hardware:
          "surface-raised text-foreground group hover:text-primary-muted font-light",
      },
      size: {
        xs: "h-10 sm:h-6 px-2 text-xs",
        sm: "h-12 sm:h-8 px-3 text-sm",
        default: "h-14 sm:h-10 px-4",
        lg: "sm:h-[140px",
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
