import { cn } from "@/shared/lib/utils";

interface ScreenBarProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "compact";
}

/**
 * Rounded bar component for screen displays
 * Used for labels and text displays in the screen area
 */
export const ScreenBar: React.FC<ScreenBarProps> = ({
  children,
  className,
  variant = "default",
}) => {
  return (
    <div
      className={cn(
        "bg-screen-foreground text-instrument flex h-5 items-center",
        variant === "default" && "rounded-tl-full px-2 pt-0.5 pl-4 text-sm",
        variant === "compact" && "rounded-tl-md rounded-br-md px-1 text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
};
