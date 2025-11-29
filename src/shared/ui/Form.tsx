import { forwardRef } from "react";
import * as FormPrimitive from "@radix-ui/react-form";

import { cn } from "@/shared/lib/utils";

export const Form = FormPrimitive.Root;

export const FormField = FormPrimitive.Field;

export const FormLabel = forwardRef<
  React.ComponentRef<typeof FormPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof FormPrimitive.Label>
>(({ className, ...props }, ref) => (
  <FormPrimitive.Label
    ref={ref}
    className={cn(
      "text-foreground-emphasis data-invalid:text-track-red mb-1 block text-sm font-medium",
      className,
    )}
    {...props}
  />
));
FormLabel.displayName = "FormLabel";

export const FormControl = FormPrimitive.Control;

export const FormMessage = forwardRef<
  React.ComponentRef<typeof FormPrimitive.Message>,
  React.ComponentPropsWithoutRef<typeof FormPrimitive.Message>
>(({ className, ...props }, ref) => (
  <FormPrimitive.Message
    ref={ref}
    className={cn("text-track-red mb-1", className)}
    {...props}
  />
));
FormMessage.displayName = "FormMessage";

export const FormValidityState = FormPrimitive.ValidityState;

export const FormSubmit = FormPrimitive.Submit;
