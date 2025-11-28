import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface IconWithLabelProps {
  icon: ReactNode;
  label: string;
  isActive?: boolean;
  iconClassName?: string;
  labelClassName?: string;
}

/**
 * A reusable component for displaying an icon/content with a label below.
 * Used primarily in buttons and actions in the mobile UI.
 */
export const IconWithLabel: React.FC<IconWithLabelProps> = ({
  icon,
  label,
  isActive = false,
  iconClassName,
  labelClassName,
}) => {
  return (
    <>
      <span
        className={cn(
          "flex h-5 items-center justify-center",
          isActive ? "text-primary-muted" : "",
          iconClassName,
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "mt-1 text-xs",
          isActive ? "text-primary-muted" : "text-foreground-muted",
          labelClassName,
        )}
      >
        {label}
      </span>
    </>
  );
};
