import { useRef } from "react";

import { DrumhausLogo } from "../icon/DrumhausLogo";
import { cn } from "../lib/utils";
import { useLightNode } from "../lightshow/useLightNode";

interface LogoAspectBoundingBoxProps {
  size: number;
  className?: string;
  ref?: React.RefObject<HTMLDivElement | null>;
}

const LogoAspectBoundingBox: React.FC<LogoAspectBoundingBoxProps> = ({
  size,
  className,
  ref,
}) => {
  return (
    <div className={cn("scale-x-[1.2]", className)} ref={ref}>
      <DrumhausLogo size={size} square />
    </div>
  );
};

/**
 * The logo is composed of 16 squares, arranged in a grid.
 *
 * Used in intro animation only.
 *
 * Logo group A (right up right up)
 *
 * <LogoAspectBoundingBox size={16} />
 * <LogoAspectBoundingBox size={16} className="rotate-270" />
 * <LogoAspectBoundingBox size={16} />
 * <LogoAspectBoundingBox size={16} className="rotate-270" />\
 *
 * Logo group B (left down left down)
 *
 * <LogoAspectBoundingBox size={16} className="rotate-180" />
 * <LogoAspectBoundingBox size={16} className="rotate-270" />
 * <LogoAspectBoundingBox size={16} className="rotate-180" />
 * <LogoAspectBoundingBox size={16} className="rotate-270" />
 */
export const LogoSweep: React.FC = () => {
  const rotate270 = "rotate-270";
  const rotate180 = "rotate-180";

  const logo1Ref = useRef<HTMLDivElement>(null);
  const logo2Ref = useRef<HTMLDivElement>(null);
  const logo3Ref = useRef<HTMLDivElement>(null);
  const logo4Ref = useRef<HTMLDivElement>(null);
  const logo5Ref = useRef<HTMLDivElement>(null);
  const logo6Ref = useRef<HTMLDivElement>(null);
  const logo7Ref = useRef<HTMLDivElement>(null);
  const logo8Ref = useRef<HTMLDivElement>(null);
  const logo9Ref = useRef<HTMLDivElement>(null);
  const logo10Ref = useRef<HTMLDivElement>(null);
  const logo11Ref = useRef<HTMLDivElement>(null);
  const logo12Ref = useRef<HTMLDivElement>(null);
  const logo13Ref = useRef<HTMLDivElement>(null);
  const logo14Ref = useRef<HTMLDivElement>(null);
  const logo15Ref = useRef<HTMLDivElement>(null);
  const logo16Ref = useRef<HTMLDivElement>(null);

  useLightNode(logo1Ref, { id: "logo1", group: "logo" });
  useLightNode(logo2Ref, { id: "logo2", group: "logo" });
  useLightNode(logo3Ref, { id: "logo3", group: "logo" });
  useLightNode(logo4Ref, { id: "logo4", group: "logo" });
  useLightNode(logo5Ref, { id: "logo5", group: "logo" });
  useLightNode(logo6Ref, { id: "logo6", group: "logo" });
  useLightNode(logo7Ref, { id: "logo7", group: "logo" });
  useLightNode(logo8Ref, { id: "logo8", group: "logo" });
  useLightNode(logo9Ref, { id: "logo9", group: "logo" });
  useLightNode(logo10Ref, { id: "logo10", group: "logo" });
  useLightNode(logo11Ref, { id: "logo11", group: "logo" });
  useLightNode(logo12Ref, { id: "logo12", group: "logo" });
  useLightNode(logo13Ref, { id: "logo13", group: "logo" });
  useLightNode(logo14Ref, { id: "logo14", group: "logo" });
  useLightNode(logo15Ref, { id: "logo15", group: "logo" });
  useLightNode(logo16Ref, { id: "logo16", group: "logo" });

  return (
    <div className="text-primary grid h-full grid-cols-16 place-items-center p-1">
      {/* A */}
      <LogoAspectBoundingBox size={16} ref={logo1Ref} />
      <LogoAspectBoundingBox size={16} className={rotate270} ref={logo2Ref} />
      <LogoAspectBoundingBox size={16} ref={logo3Ref} />
      <LogoAspectBoundingBox size={16} className={rotate270} ref={logo4Ref} />

      {/* B */}
      <LogoAspectBoundingBox size={16} className={rotate180} ref={logo5Ref} />
      <LogoAspectBoundingBox size={16} className={rotate270} ref={logo6Ref} />
      <LogoAspectBoundingBox size={16} className={rotate180} ref={logo7Ref} />
      <LogoAspectBoundingBox size={16} className={rotate270} ref={logo8Ref} />

      {/* A */}
      <LogoAspectBoundingBox size={16} ref={logo9Ref} />
      <LogoAspectBoundingBox size={16} className={rotate270} ref={logo10Ref} />
      <LogoAspectBoundingBox size={16} ref={logo11Ref} />
      <LogoAspectBoundingBox size={16} className={rotate270} ref={logo12Ref} />

      {/* B */}
      <LogoAspectBoundingBox size={16} className={rotate180} ref={logo13Ref} />
      <LogoAspectBoundingBox size={16} className={rotate270} ref={logo14Ref} />
      <LogoAspectBoundingBox size={16} className={rotate180} ref={logo15Ref} />
      <LogoAspectBoundingBox size={16} className={rotate270} ref={logo16Ref} />
    </div>
  );
};
