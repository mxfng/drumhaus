import { cn } from "@/shared/lib/utils";

type MiniStepGridProps = {
  steps: boolean[];
  activeClassName?: string;
  inactiveClassName?: string;
  className?: string;
};

/**
 * Minimal 16-step grid for groove edit screens (accent/ratchet/flam) and previews.
 */
export const MiniStepGrid: React.FC<MiniStepGridProps> = ({
  steps,
  activeClassName = "border-primary bg-primary/20 text-primary",
  inactiveClassName = "border-foreground-muted/30 bg-foreground-muted/5 text-foreground-muted",
  className,
}) => {
  if (!steps.length) return null;

  return (
    <div className={cn("flex flex-1 items-center gap-1", className)}>
      {steps.map((isActive, idx) => (
        <div
          key={idx}
          className={cn(
            "flex h-3 flex-1 items-center justify-center rounded-tr-sm rounded-bl-sm border text-[8px]",
            isActive ? activeClassName : inactiveClassName,
          )}
        >
          {isActive && (idx + 1).toString().padStart(2, "0")}
        </div>
      ))}
    </div>
  );
};
