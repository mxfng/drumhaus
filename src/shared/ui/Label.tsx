import { forwardRef } from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

export const Label = forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ ...props }, ref) => <LabelPrimitive.Root ref={ref} {...props} />);
Label.displayName = LabelPrimitive.Root.displayName;
