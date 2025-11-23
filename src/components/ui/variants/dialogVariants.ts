import { cva } from "class-variance-authority";

const dialogVariants = cva(
  "shadow-neu-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 fixed top-1/2 left-1/2 z-50 flex w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl p-6",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(160deg,var(--color-gradient-light),var(--color-gradient-dark))]",
        primary:
          "bg-primary text-white rounded-none rounded-tr-4xl rounded-bl-4xl",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export { dialogVariants };
