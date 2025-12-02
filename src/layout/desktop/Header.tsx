import { Screen } from "@/layout/desktop/Screen";
import { DrumhausLogo } from "@/shared/icon/DrumhausLogo";
import { DrumhausTypographyLogo } from "@/shared/icon/DrumhausTypographyLogo";
import { useDialogStore } from "@/shared/store/useDialogStore";

export const Header: React.FC = () => {
  const openDialog = useDialogStore((state) => state.openDialog);

  return (
    <div className="surface grid h-24 grid-cols-8 p-6">
      <div className="col-span-4 flex flex-row items-end">
        <button
          className="flex cursor-pointer items-end"
          onClick={() => openDialog("about")}
        >
          <div className="text-primary flex items-end">
            <DrumhausLogo size={32} />
          </div>
          <div className="text-primary ml-1.5 flex items-end">
            <DrumhausTypographyLogo size={280} />
          </div>
          <div className="-mb-1 ml-4 text-left text-sm">
            <p className="opacity-70">Computer Controlled</p>
            <p className="opacity-70">Rhythmic Groove Machine</p>
          </div>
        </button>
      </div>

      <Screen />
    </div>
  );
};
