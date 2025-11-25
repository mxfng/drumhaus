import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer flex items-center justify-center",
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
        xs: "h-6 px-2 text-xs",
        sm: "h-8 px-3 text-sm",
        default: "h-10 px-4",
        icon: "h-10 w-10 p-2",
        "icon-sm": "h-6 w-6 p-1",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export { buttonVariants };
