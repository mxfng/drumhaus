import { useEffect, useState } from "react";

import {
  calculateExportDuration,
  exportToWav,
  getSuggestedBars,
} from "@/core/audio/export/wavExporter";
import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { PixelatedSpinner } from "@/shared/components/PixelatedSpinner";
import {
  Button,
  Checkbox,
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Slider,
  useToast,
} from "@/shared/ui";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type SampleRateOption = "system" | "44100" | "48000";

const sampleRateOptions: { value: SampleRateOption; label: string }[] = [
  { value: "system", label: "System" },
  { value: "44100", label: "44.1 kHz" },
  { value: "48000", label: "48 kHz" },
];

// Consistent field wrapper
const FormField = ({
  children,
  label,
  htmlFor,
}: {
  children: React.ReactNode;
  label: string;
  htmlFor?: string;
}) => (
  <div className="space-y-2">
    <Label htmlFor={htmlFor} className="block">
      {label}
    </Label>
    {children}
  </div>
);

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const variationCycle = usePatternStore((state) => state.variationCycle);
  const bpm = useTransportStore((state) => state.bpm);
  const presetName = usePresetMetaStore(
    (state) => state.currentPresetMeta.name,
  );

  const [filename, setFilename] = useState("");
  const [bars, setBars] = useState(1);
  const [sampleRate, setSampleRate] = useState<SampleRateOption>("system");
  const [includeTail, setIncludeTail] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { toast } = useToast();

  // Set defaults when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFilename(presetName);
      setBars(getSuggestedBars(variationCycle));
      setIsExporting(false);
    }
  }, [isOpen, variationCycle, presetName]);

  const baseDuration = calculateExportDuration(bars, bpm);
  const duration = baseDuration + (includeTail ? 2 : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);

    try {
      const actualSampleRate =
        sampleRate === "system"
          ? new AudioContext().sampleRate
          : parseInt(sampleRate);

      await exportToWav({
        bars,
        sampleRate: actualSampleRate,
        includeTail,
        filename: filename.trim() || "drumhaus-export",
      });

      toast({
        title: "Export successful",
        description: "Your audio file has been exported.",
        duration: 8000,
      });
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Something went wrong",
        description: "Couldn't export audio. Please try again.",
        status: "error",
        duration: 8000,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isExporting && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>
        <DialogCloseButton />

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 pb-4">
            <DialogDescription>
              Export your pattern as a WAV audio file.
            </DialogDescription>

            {/* File settings */}
            <FormField label="Filename" htmlFor="filename">
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                disabled={isExporting}
                autoFocus
              />
            </FormField>

            {/* Audio settings group */}
            <div className="border-shadow-30 space-y-8 rounded-lg border p-4">
              {/* Length */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bars">Length</Label>
                  <span className="text-foreground-emphasis text-sm">
                    {bars} {bars === 1 ? "bar" : "bars"}
                  </span>
                </div>
                <Slider
                  id="bars"
                  value={[bars]}
                  onValueChange={([value]) => setBars(value)}
                  min={1}
                  max={8}
                  step={1}
                  disabled={isExporting}
                />
                <div className="flex justify-between px-[8px]">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <div key={n} className="flex flex-col items-center">
                      <div className="bg-foreground-muted h-1 w-px" />
                      <span
                        className={`mt-0.5 text-[10px] ${[1, 2, 4, 8].includes(n) ? "text-foreground-emphasis" : "text-foreground-muted"}`}
                      >
                        {n}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-foreground-muted text-xs">
                  Recommended: {getSuggestedBars(variationCycle)}{" "}
                  {getSuggestedBars(variationCycle) === 1 ? "bar" : "bars"}
                </p>
              </div>

              {/* Sample rate */}
              <FormField label="Sample rate">
                <RadioGroup
                  value={sampleRate}
                  onValueChange={(value) =>
                    setSampleRate(value as SampleRateOption)
                  }
                  disabled={isExporting}
                  className="flex gap-4"
                >
                  {sampleRateOptions.map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label
                        htmlFor={option.value}
                        className="cursor-pointer font-normal"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <p className="text-foreground-muted text-xs">
                  For audio nerds. System is usually fine.
                </p>
              </FormField>

              {/* Reverb tail */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeTail"
                  checked={includeTail}
                  onCheckedChange={(checked) =>
                    setIncludeTail(checked === true)
                  }
                  disabled={isExporting}
                />
                <Label htmlFor="includeTail" className="cursor-pointer">
                  Include reverb tail
                </Label>
              </div>
            </div>

            {/* Output info */}
            <div>Duration: {duration.toFixed(1)}s</div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isExporting}
              type="button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isExporting}
              className="flex items-center"
            >
              <span className={isExporting ? "mr-2" : ""}>
                {isExporting ? "Exporting" : "Export"}
              </span>
              {isExporting && (
                <PixelatedSpinner
                  color="currentColor"
                  size={20}
                  pixelSize={2}
                  gap={2}
                />
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
