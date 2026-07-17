import { useState } from "react";
import {
  platformShortcutLabel,
  FloatingMenu as ShellFloatingMenu,
} from "@haus/shell";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@haus/ui";

import { useDebugStore } from "@/features/debug/store/use-debug-store";
import { useNightModeStore } from "@/features/night/store/use-night-mode-store";
import { redo, undo } from "@/features/preset/history/history";
import { useHistoryStore } from "@/features/preset/history/use-history-store";
import { AboutDialog } from "@/shared/dialogs/about-dialog";
import { DrumhausLogo } from "@/shared/icon/drumhaus-logo";
import { layoutScale } from "@/shared/store/layout-scale";
import { usePerformanceStore } from "@/shared/store/use-performance-store";

const UNDO_SHORTCUT_LABEL = platformShortcutLabel("⌘Z", "Ctrl+Z");
const REDO_SHORTCUT_LABEL = platformShortcutLabel("⇧⌘Z", "Ctrl+Shift+Z");

function FloatingMenu() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const canUndo = useHistoryStore((state) => state.past.length > 0);
  const canRedo = useHistoryStore((state) => state.future.length > 0);

  const debugMode = useDebugStore((state) => state.debugMode);
  const toggleDebugMode = useDebugStore((state) => state.toggleDebugMode);
  const potatoMode = usePerformanceStore((state) => state.potatoMode);
  const togglePotatoMode = usePerformanceStore(
    (state) => state.togglePotatoMode,
  );
  const nightMode = useNightModeStore((state) => state.nightMode);
  const toggleNightMode = useNightModeStore((state) => state.toggleNightMode);

  const handleTogglePotatoMode = () => {
    if (nightMode) {
      toggleNightMode();
    }

    if (debugMode) {
      toggleDebugMode();
    }

    togglePotatoMode();
  };

  return (
    <>
      <ShellFloatingMenu
        layoutScale={layoutScale}
        trigger={<DrumhausLogo size={20} fill="currentColor" />}
      >
        <DropdownMenuItem onSelect={() => setIsAboutOpen(true)}>
          About Drumhaus
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            window.open(
              "https://ko-fi.com/maxfung",
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          Donate
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            window.open(
              "https://github.com/mxfng/drumhaus/issues",
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          Report an Issue
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={undo} disabled={!canUndo}>
          Undo
          <DropdownMenuShortcut>{UNDO_SHORTCUT_LABEL}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={redo} disabled={!canRedo}>
          Redo
          <DropdownMenuShortcut>{REDO_SHORTCUT_LABEL}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={nightMode}
          onCheckedChange={toggleNightMode}
          disabled={potatoMode}
        >
          Night Mode
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={debugMode}
          onCheckedChange={toggleDebugMode}
          disabled={potatoMode}
        >
          Debug Mode
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={potatoMode}
          onCheckedChange={handleTogglePotatoMode}
        >
          Potato Mode
        </DropdownMenuCheckboxItem>
      </ShellFloatingMenu>

      <AboutDialog isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
}

export { FloatingMenu };
