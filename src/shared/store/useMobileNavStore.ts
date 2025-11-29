import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { InstrumentMode } from "@/features/instrument/components/MobileInstrumentContextMenu";
import type { BusSubTab } from "@/features/master-bus/components/MobileBusContextMenu";
import type { TabType } from "@/layout/mobile/MobileTabView";

type MobileNavStoreType = {
  activeTab: TabType;
  instrumentMode: InstrumentMode;
  busSubTab: BusSubTab;
  menuOpen: boolean;
  setActiveTab: (tab: TabType) => void;
  setInstrumentMode: (mode: InstrumentMode) => void;
  setBusSubTab: (subTab: BusSubTab) => void;
  setMenuOpen: (open: boolean) => void;
};

export const useMobileNavStore = create<MobileNavStoreType>()(
  devtools(
    immer((set) => ({
      activeTab: "controls",
      instrumentMode: "trigger",
      busSubTab: "comp",
      menuOpen: false,
      setActiveTab: (tab) => {
        set((state) => {
          state.activeTab = tab;
        });
      },
      setInstrumentMode: (mode) => {
        set((state) => {
          state.instrumentMode = mode;
        });
      },
      setBusSubTab: (subTab) => {
        set((state) => {
          state.busSubTab = subTab;
        });
      },
      setMenuOpen: (open) => {
        set((state) => {
          state.menuOpen = open;
        });
      },
    })),
    {
      name: "MobileNavStore",
    },
  ),
);
