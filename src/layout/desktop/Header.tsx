import FrequencyAnalyzer from "@/shared/components/FrequencyAnalyzer";
import { DrumhausLogo } from "@/shared/icon/DrumhausLogo";
import { DrumhausTypographyLogo } from "@/shared/icon/DrumhausTypographyLogo";
import { useDialogStore } from "@/shared/store/useDialogStore";

export const Header: React.FC = () => {
  const openDialog = useDialogStore((state) => state.openDialog);

  return (
    <div className="surface mb-2 grid h-[120px] grid-cols-8 shadow-[0_4px_8px_var(--color-shadow-60)]">
      <div className="col-span-5 flex h-[120px] flex-row items-end pb-4 pl-8">
        <button
          className="flex cursor-pointer items-end"
          onClick={() => openDialog("about")}
        >
          <div className="text-primary flex items-end">
            <DrumhausLogo size={46} />
          </div>
          <div className="text-primary ml-2 flex items-end">
            <DrumhausTypographyLogo size={420} />
          </div>
          <div className="-mb-1 ml-4 text-left">
            <p className="opacity-70">Browser Controlled</p>
            <p className="opacity-70">Rhythmic Groove Machine</p>
          </div>
        </button>
      </div>

      <div className="col-span-3 m-4 overflow-hidden rounded-2xl opacity-60 shadow-[0_2px_8px_var(--color-shadow-60)_inset]">
        <FrequencyAnalyzer />
      </div>
    </div>
  );
};
