import React from "react";
import { Eraser } from "lucide-react";

import { ScreenBar } from "@/layout/ScreenBar";

export const ClearScreen: React.FC = () => {
  return (
    <div className="bg-screen flex h-full flex-col gap-1 pt-1">
      <div className="flex flex-1 items-center justify-start gap-2 px-5">
        <Eraser size={20} className="text-foreground-muted" />
        <span className="-my-1 text-[10px] leading-3 normal-case">
          Clear mode is enabled
          <br />
          Tap an instrument or variation to clear it
        </span>
      </div>
      <ScreenBar>
        <p>copy mode</p>
      </ScreenBar>
    </div>
  );
};
