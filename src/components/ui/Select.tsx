import { forwardRef } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { IoCheckmark, IoChevronDown, IoChevronUp } from "react-icons/io5";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={`
      flex h-10 w-full items-center justify-between rounded-md
      bg-transparent px-3 py-2
      font-pixel text-sm text-text
      placeholder:text-text-light
      focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
      disabled:cursor-not-allowed disabled:opacity-50
      ${className ?? ""}
    `}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <IoChevronDown className="h-4 w-4 text-text" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectScrollUpButton = forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={`flex cursor-default items-center justify-center py-1 ${className ?? ""}`}
    {...props}
  >
    <IoChevronUp className="h-4 w-4 text-text" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = "SelectScrollUpButton";

export const SelectScrollDownButton = forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={`flex cursor-default items-center justify-center py-1 ${className ?? ""}`}
    {...props}
  >
    <IoChevronDown className="h-4 w-4 text-text" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = "SelectScrollDownButton";

export const SelectContent = forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={`
        relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md
        shadow-neu
        bg-[linear-gradient(160deg,var(--color-gradient-light),var(--color-gradient-dark))]
        data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
        data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
        data-[side=bottom]:slide-in-from-top-2
        data-[side=left]:slide-in-from-right-2
        data-[side=right]:slide-in-from-left-2
        data-[side=top]:slide-in-from-bottom-2
        ${position === "popper" ? "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1" : ""}
        ${className ?? ""}
      `}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={`p-1 ${position === "popper" ? "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]" : ""}`}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectLabel = forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={`py-1.5 pl-8 pr-2 font-pixel text-sm font-semibold text-text ${className ?? ""}`}
    {...props}
  />
));
SelectLabel.displayName = "SelectLabel";

export const SelectItem = forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={`
      relative flex w-full cursor-default select-none items-center
      rounded-sm py-1.5 pl-8 pr-2
      font-pixel text-sm text-text
      outline-none
      focus:bg-accent focus:text-white
      data-[disabled]:pointer-events-none data-[disabled]:opacity-50
      ${className ?? ""}
    `}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <IoCheckmark className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

export const SelectSeparator = forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={`-mx-1 my-1 h-px bg-text-light ${className ?? ""}`}
    {...props}
  />
));
SelectSeparator.displayName = "SelectSeparator";
