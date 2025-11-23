import type { CSSProperties } from "react";

import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";

type VerticalMeterProps = {
  percent: number;
  direction?: "up" | "down";
  tooltip?: string;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  valueText?: string;
  label?: string;
  fillClassName?: string;
  trackClassName?: string;
  className?: string;
  style?: CSSProperties;
  valueClassName?: string;
  labelClassName?: string;
};

export const VerticalMeter: React.FC<VerticalMeterProps> = ({
  percent,
  direction = "up",
  tooltip,
  tooltipSide = "top",
  valueText,
  label,
  fillClassName = "bg-primary",
  trackClassName,
  className,
  style,
  valueClassName,
  labelClassName,
}) => {
  const clamped = Math.min(100, Math.max(0, percent));
  const fillPositionStyle =
    direction === "up"
      ? { height: `${clamped}%`, bottom: 0 }
      : { height: `${clamped}%`, top: 0 };

  const meter = (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center gap-1",
        className,
      )}
      style={style}
    >
      <div
        className={cn(
          "outline-primary relative w-5 flex-1 overflow-hidden rounded-[0_200px_0_200px] bg-transparent outline-1",
          trackClassName,
        )}
      >
        <div
          className={cn(
            "absolute right-0 left-0 blur-xs transition-all duration-75",
            fillClassName,
          )}
          style={fillPositionStyle}
        />
      </div>
      {valueText && (
        <span
          className={cn(
            "text-foreground-muted font-pixel text-[8px] tabular-nums",
            valueClassName,
          )}
        >
          {valueText}
        </span>
      )}
      {label && (
        <span
          className={cn("text-foreground-muted text-[9px]", labelClassName)}
        >
          {label}
        </span>
      )}
    </div>
  );

  if (!tooltip) {
    return meter;
  }

  return (
    <Tooltip content={tooltip} delayDuration={1000} side={tooltipSide}>
      {meter}
    </Tooltip>
  );
};
