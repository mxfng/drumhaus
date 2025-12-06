import { cn } from "@/shared/lib/utils";

interface ScreenBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Rounded bar component for screen displays
 * Used for labels and text displays in the screen area
 */
export const ScreenBar: React.FC<ScreenBarProps> = ({
  children,
  className,
}) => {
  return (
    <div className="bg-screen-foreground text-screen rounded-tl-full rounded-br-md">
      <div
        className={cn(
          "flex -translate-y-px items-center px-4 text-sm",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
};
