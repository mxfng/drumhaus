import { forwardRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { IoClose } from "react-icons/io5";

/* Dialog Root */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

/* Dialog Overlay */
export const DialogOverlay = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={`bg-shadow-10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-50 ${className ?? ""} `}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

/* Dialog Content */
export const DialogContent = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={`shadow-neu-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[linear-gradient(160deg,var(--color-gradient-light),var(--color-gradient-dark))] p-6 ${className ?? ""} `}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = "DialogContent";

/* Dialog Header */
export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col space-y-1.5 text-center sm:text-left ${className ?? ""}`}
      {...props}
    />
  );
}

/* Dialog Footer */
export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className ?? ""}`}
      {...props}
    />
  );
}

/* Dialog Title */
export const DialogTitle = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={`font-pixel text-text-dark text-lg font-semibold ${className ?? ""}`}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

/* Dialog Description */
export const DialogDescription = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={`font-pixel text-text text-sm ${className ?? ""}`}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

/* Dialog Close Button */
export function DialogCloseButton() {
  return (
    <DialogPrimitive.Close className="focus:ring-accent absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none">
      <IoClose className="text-text h-5 w-5" />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  );
}
