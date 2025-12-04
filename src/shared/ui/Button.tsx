import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "transition-all duration-200 flex items-center justify-center [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary hover:bg-primary-muted rounded-tl-lg rounded-br-lg text-primary-foreground px-6",
        secondary: "hover:text-foreground-muted px-6",
        hardware:
          "neu-raised text-foreground group hover:text-primary-muted font-light border rounded-lg w-full",
        hardwareIcon:
          "surface-raised text-foreground group hover:text-primary-muted font-light border rounded-full aspect-square",
        screen: "rounded-none bg-transparent p-0.5 hover:bg-screen/20",
      },
      size: {
        xs: "h-8 text-sm",
        sm: "h-10 text-sm",
        default: "h-12",
        lg: "h-16",
        icon: "h-8 w-8",
        screen: "h-full w-full",
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
